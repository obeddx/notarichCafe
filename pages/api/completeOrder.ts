import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID wajib diisi" });
    }

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
        discount: true, // Sertakan relasi discount untuk scope TOTAL
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Order tidak ditemukan" });
    }

    if (order.status === "Selesai") {
      return res.status(400).json({ message: "Pesanan sudah selesai" });
    }

    // --- 1. Kurangi stok bahan berdasarkan menu yang dipesan ---
    const updatedIngredientStocks = new Map<number, number>();

    for (const orderItem of order.orderItems) {
      const menu = orderItem.menu;
      for (const menuIngredient of menu.ingredients) {
        const ingredient = menuIngredient.ingredient;
        const amountUsed = menuIngredient.amount * orderItem.quantity;

        const updatedIngredient = await prisma.ingredient.update({
          where: { id: ingredient.id },
          data: {
            used: { increment: amountUsed },
            stock: { decrement: amountUsed },
          },
        });

        updatedIngredientStocks.set(ingredient.id, updatedIngredient.stock);

        if (updatedIngredient.stock <= 0) {
          await prisma.menu.update({
            where: { id: menu.id },
            data: { Status: "habis" },
          });
        }
      }
    }

    // --- 2. Hitung max beli untuk setiap menu yang terpengaruh ---
    const updatedIngredientIds = Array.from(updatedIngredientStocks.keys());

    const menusToRecalculate = await prisma.menu.findMany({
      where: {
        ingredients: {
          some: {
            ingredientId: { in: updatedIngredientIds },
          },
        },
      },
      include: {
        ingredients: {
          include: { ingredient: true },
        },
      },
    });

    const menuMaxBeli = new Map<number, number>();

    for (const menu of menusToRecalculate) {
      let maxPurchase = Infinity;
      for (const menuIngredient of menu.ingredients) {
        let currentStock = updatedIngredientStocks.get(menuIngredient.ingredient.id);
        if (currentStock === undefined) {
          currentStock = menuIngredient.ingredient.stock;
        }

        if (menuIngredient.amount <= 0) {
          maxPurchase = 0;
          break;
        }

        const possible = Math.floor(currentStock / menuIngredient.amount);
        maxPurchase = Math.min(maxPurchase, possible);
      }
      if (maxPurchase === Infinity) {
        maxPurchase = 0;
      }
      menuMaxBeli.set(menu.id, maxPurchase);
    }

    // --- 3. Update field maxBeli pada tabel menu ---
    for (const [menuId, maxBeli] of menuMaxBeli.entries()) {
      const updateData: { maxBeli: number; Status?: string } = { maxBeli };
      if (maxBeli === 0) {
        updateData.Status = "Habis";
      }

      await prisma.menu.update({
        where: { id: menuId },
        data: updateData,
      });
    }

    console.log(
      "Max beli per menu:",
      Array.from(menuMaxBeli.entries()).map(([menuId, maxBeli]) => ({
        menuId,
        maxBeli,
      }))
    );

    // --- 4. Pindahkan data order ke CompletedOrder ---
    await prisma.completedOrder.create({
      data: {
        originalOrderId: order.id,
        tableNumber: order.tableNumber,
        total: order.total,
        discountId: order.discountId, // Salin discountId
        discountAmount: order.discountAmount, // Salin discountAmount
        taxAmount: order.taxAmount, // Salin taxAmount
        gratuityAmount: order.gratuityAmount, // Salin gratuityAmount
        finalTotal: order.finalTotal, // Salin finalTotal
        paymentMethod: order.paymentMethod,
        paymentId: order.paymentId,
        createdAt: order.createdAt,
        orderItems: {
          create: order.orderItems.map((item) => ({
            menuId: item.menuId,
            quantity: item.quantity,
            note: item.note || null,
            price: item.price, // Salin harga per item
            discountAmount: item.discountAmount, // Salin diskon per item
          })),
        },
      },
    });

    // --- 5. Update status order menjadi "Selesai" ---
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "Selesai" },
    });

    return res.status(200).json({
      message:
        "Pesanan selesai, stok dikurangi, max beli diperbarui, dan order dicatat ke riwayat.",
      maxBeliPerMenu: Array.from(menuMaxBeli.entries()).map(([menuId, maxBeli]) => ({
        menuId,
        maxBeli,
      })),
    });
  } catch (error) {
    console.error("❌ Error menyelesaikan pesanan:", error);
    return res.status(500).json({ message: "Gagal menyelesaikan pesanan." });
  }
}