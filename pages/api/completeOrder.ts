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
      const updatedIngredientStocks = new Map<number, number>();

      // Update stok bahan berdasarkan pesanan
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

      // Hitung ulang maxBeli untuk menu yang terpengaruh
      const updatedIngredientIds = Array.from(updatedIngredientStocks.keys());
      const menusToRecalculate = await prisma.menu.findMany({
        where: {
          ingredients: {
            some: { ingredientId: { in: updatedIngredientIds } },
          },
        },
        include: {
          ingredients: { include: { ingredient: true } },
        },
      });

      for (const menu of menusToRecalculate) {
        let maxPurchase = Infinity;
        for (const menuIngredient of menu.ingredients) {
          let currentStock = updatedIngredientStocks.get(menuIngredient.ingredient.id) ?? menuIngredient.ingredient.stock;
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
          total: order.total,              // Subtotal sebelum diskon, pajak, dan gratuity
          discountId: order.discountId,    // Foreign key ke Discount (jika ada)
          discountAmount: order.discountAmount, // Jumlah diskon
          taxAmount: order.taxAmount,      // Jumlah pajak
          gratuityAmount: order.gratuityAmount, // Jumlah gratuity
          finalTotal: order.finalTotal,    // Total akhir setelah diskon, pajak, dan gratuity
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