import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { orderId } = req.body;

    // Ambil data order yang akan dipindahkan beserta menu dan bahan-bahannya
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            menu: {
              include: {
                ingredients: {
                  include: {
                    ingredient: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Order tidak ditemukan" });
    }

    // 1. Kurangi stok bahan berdasarkan menu yang dipesan
    for (const orderItem of order.orderItems) {
      const menu = orderItem.menu;
      for (const menuIngredient of menu.ingredients) {
        const ingredient = menuIngredient.ingredient;
        const amountUsed = menuIngredient.amount * orderItem.quantity;

        // Update stok bahan
        await prisma.ingredient.update({
          where: { id: ingredient.id },
          data: {
            used: { increment: amountUsed }, // Tambahkan ke kolom `used`
            stock: { decrement: amountUsed }, // Kurangi dari kolom `stock`
          },
        });
      }
    }

    // 2. Pindahkan data order ke CompletedOrder tanpa menghapus order asli
    await prisma.completedOrder.create({
      data: {
        originalOrderId: order.id, // Menyimpan ID order asli
        tableNumber: order.tableNumber,
        total: order.total,
        paymentMethod: order.paymentMethod,
        paymentId: order.paymentId,
        createdAt: order.createdAt,
        orderItems: {
          create: order.orderItems.map((item) => ({
            menuId: item.menuId,
            quantity: item.quantity,
            note: item.note,
          })),
        },
      },
    });

    // 3. Update status order menjadi "Selesai"
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "Selesai" },
    });

    return res.status(200).json({ message: "Pesanan selesai, stok dikurangi, dicatat ke riwayat, dan status diperbarui." });
  } catch (error) {
    console.error("❌ Error menyelesaikan pesanan:", error);
    return res.status(500).json({ message: "Gagal menyelesaikan pesanan." });
  }
}