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
            bundle: true, // Include bundle jika diperlukan
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

        // Simpan stok terbaru di map
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

    // --- 2. Hitung max beli untuk setiap menu ---
    // Rumus: max beli = Math.floor( ingredient.stock / menuIngredient.amount )
    // untuk masing-masing ingredient di menu, ambil nilai minimum dari semua perhitungan tersebut.
    const menuMaxBeli = new Map<number, number>();
    const processedMenus = new Set<number>();

    for (const orderItem of order.orderItems) {
      const menu = orderItem.menu;
      // Pastikan setiap menu hanya dihitung satu kali
      if (processedMenus.has(menu.id)) continue;
      processedMenus.add(menu.id);

      let maxPurchase = Infinity;
      for (const menuIngredient of menu.ingredients) {
        // Ambil stok terbaru dari map; jika tidak ada, ambil dari database
        let currentStock = updatedIngredientStocks.get(menuIngredient.ingredient.id);
        if (currentStock === undefined) {
          const ingredientRecord = await prisma.ingredient.findUnique({
            where: { id: menuIngredient.ingredient.id },
          });
          currentStock = ingredientRecord ? ingredientRecord.stock : 0;
        }

        // Jika amount tidak valid, set maxPurchase ke 0
        if (menuIngredient.amount <= 0) {
          maxPurchase = 0;
          break;
        }

        const possible = Math.floor(currentStock / menuIngredient.amount);
        maxPurchase = Math.min(maxPurchase, possible);
      }
      menuMaxBeli.set(menu.id, maxPurchase);
    }

    // --- 3. Update field maxBeli pada tabel menu ---
    for (const [menuId, maxBeli] of menuMaxBeli.entries()) {
      await prisma.menu.update({
        where: { id: menuId },
        data: { maxBeli: maxBeli },
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
            bundleId: item.bundleId,
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
