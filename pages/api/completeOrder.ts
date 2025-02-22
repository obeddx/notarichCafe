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
             // Include bundle jika diperlukan
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Order tidak ditemukan" });
    }

    // --- 1. Kurangi stok bahan berdasarkan menu yang dipesan ---
    // Simpan stok terbaru tiap ingredient agar bisa digunakan untuk perhitungan max beli
    const updatedIngredientStocks = new Map<number, number>();

    for (const orderItem of order.orderItems) {
      const menu = orderItem.menu;
      for (const menuIngredient of menu.ingredients) {
        const ingredient = menuIngredient.ingredient;
        const amountUsed = menuIngredient.amount * orderItem.quantity;

        // Update stok bahan: tambahkan ke kolom `used` dan kurangi dari kolom `stock`
        const updatedIngredient = await prisma.ingredient.update({
          where: { id: ingredient.id },
          data: {
            used: { increment: amountUsed },
            stock: { decrement: amountUsed },
          },
        });

        // Simpan stok terbaru di map (jika ingredient yang sama digunakan di menu lain, nilainya akan ter-update)
        updatedIngredientStocks.set(ingredient.id, updatedIngredient.stock);

        // Jika stok mencapai 0, nonaktifkan menu dengan mengubah status menjadi "habis"
        if (updatedIngredient.stock <= 0) {
          await prisma.menu.update({
            where: { id: menu.id },
            data: { Status: "habis" },
          });
        }
      }
    }

    // --- 2. Hitung max beli untuk setiap menu yang terpengaruh ---
    // Ambil semua ingredient id yang diupdate
    const updatedIngredientIds = Array.from(updatedIngredientStocks.keys());

    // Cari seluruh menu yang menggunakan setidaknya salah satu ingredient yang diupdate
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
        // Gunakan stok terbaru jika ingredient termasuk dalam yang diupdate, jika tidak gunakan stok yang sudah ada
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
      // Jika tidak ada bahan atau perhitungannya tidak valid, set maxPurchase ke 0
      if (maxPurchase === Infinity) {
        maxPurchase = 0;
      }
      menuMaxBeli.set(menu.id, maxPurchase);
    }

    // --- 3. Update field maxBeli pada tabel menu ---
for (const [menuId, maxBeli] of menuMaxBeli.entries()) {
  const updateData: { maxBeli: number; Status?: string } = { maxBeli };

  // Jika maxBeli == 0, update status menu menjadi "Habis"
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

    // --- 4. Pindahkan data order ke CompletedOrder tanpa menghapus order asli ---
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

    // --- 5. Update status order menjadi "Selesai" ---
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "Selesai" },
    });

    return res.status(200).json({
      message:
        "Pesanan selesai, stok dikurangi, max beli diperbarui, dan order dicatat ke riwayat.",
      maxBeliPerMenu: Array.from(menuMaxBeli.entries()).map(
        ([menuId, maxBeli]) => ({ menuId, maxBeli })
      ),
    });
  } catch (error) {
    console.error("❌ Error menyelesaikan pesanan:", error);
    return res.status(500).json({ message: "Gagal menyelesaikan pesanan." });
  }
}
