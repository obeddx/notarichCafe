import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

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

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            menu: {
              include: { ingredients: { include: { ingredient: true } } },
            },
            modifiers: { include: { modifier: true } },
          },
        },
        discount: true,
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Order tidak ditemukan" });
    }

    if (order.status === "Selesai") {
      return res.status(400).json({ message: "Pesanan sudah selesai" });
    }

    const menuMaxBeli: Map<number, number> = new Map();

    await prisma.$transaction(async (prisma) => {
      // Hitung ulang maxBeli untuk menu yang terpengaruh (tanpa pengurangan stok ulang)
      const menuIds = order.orderItems.map((item) => item.menuId);
      const menusToRecalculate = await prisma.menu.findMany({
        where: { id: { in: menuIds } },
        include: {
          ingredients: { include: { ingredient: true } },
        },
      });

      for (const menu of menusToRecalculate) {
        let maxPurchase = Infinity;
        for (const menuIngredient of menu.ingredients) {
          const currentStock = menuIngredient.ingredient.stock;
          if (menuIngredient.amount <= 0) {
            maxPurchase = 0;
            break;
          }
          const possible = Math.floor(currentStock / menuIngredient.amount);
          maxPurchase = Math.min(maxPurchase, possible);
        }
        if (maxPurchase === Infinity) maxPurchase = 0;
        menuMaxBeli.set(menu.id, maxPurchase);
      }

      for (const [menuId, maxBeli] of menuMaxBeli.entries()) {
        const updateData: { maxBeli: number; Status?: string } = { maxBeli };
        if (maxBeli === 0) updateData.Status = "Habis";
        await prisma.menu.update({
          where: { id: menuId },
          data: updateData,
        });
      }

      // Simpan ke completedOrder dengan struktur yang sesuai untuk HistoryPage
      await prisma.completedOrder.create({
        data: {
          originalOrderId: order.id,
          tableNumber: order.tableNumber,
          total: order.total,
          discountId: order.discountId,
          discountAmount: order.discountAmount,
          taxAmount: order.taxAmount,
          gratuityAmount: order.gratuityAmount,
          finalTotal: order.finalTotal,
          paymentMethod: order.paymentMethod,
          paymentId: order.paymentId,
          createdAt: new Date(),
          orderItems: {
            create: order.orderItems.map((item) => ({
              menuId: item.menuId,
              quantity: item.quantity,
              note: item.note || null,
              price: item.price,
              discountAmount: item.discountAmount,
              modifiers: {
                create: item.modifiers.map((mod) => ({
                  modifierId: mod.modifierId,
                })),
              },
            })),
          },
        },
      });

      // Perbarui status pesanan menjadi "Selesai"
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "Selesai" },
      });
    });

    return res.status(200).json({
      message: "Pesanan selesai dan tercatat di riwayat.",
      maxBeliPerMenu: Array.from(menuMaxBeli.entries()).map(([menuId, maxBeli]) => ({
        menuId,
        maxBeli,
      })),
    });
  } catch (error) {
    console.error("❌ Error menyelesaikan pesanan:", error);
    return res.status(500).json({ 
      message: "Gagal menyelesaikan pesanan.", 
      error: (error as Error).message 
    });
  } finally {
    await prisma.$disconnect();
  }
}