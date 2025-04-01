// /pages/api/resetDailyStock.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Ambil tanggal hari ini sebagai timestamp untuk histori
    const today = new Date();

    // Ambil semua record ingredient
    const ingredients = await prisma.ingredient.findMany({
      where: {
        isActive: true
      }
    });
    

    for (const ingredient of ingredients) {
      // Simpan snapshot harian ke tabel DailyIngredientStock
      await prisma.dailyIngredientStock.create({
        data: {
          date: today,
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          start: ingredient.start,
          stockIn: ingredient.stockIn,
          used: ingredient.used,
          wasted: ingredient.wasted,
          stock: ingredient.stock,
          stockMin: ingredient.stockMin,
        },
      });

      // Reset data ingredient untuk hari baru:
      // Jadikan stok akhir hari ini sebagai stok awal hari berikutnya,
      // dan reset transaksi harian ke 0.
      await prisma.ingredient.update({
        where: { id: ingredient.id },
        data: {
          start: ingredient.stock,
          stockIn: 0,
          used: 0,
          wasted: 0,
          stockMin: ingredient.stockMin,
          stock: ingredient.stock, // stock baru sama dengan start, karena belum ada transaksi
        },
      });
    }

    return res
      .status(200)
      .json({ message: "Daily stock reset successful and history saved." });
  } catch (error) {
    console.error("Error resetting daily stock:", error);
    return res
      .status(500)
      .json({ message: "Failed to reset daily stock" });
  }
}
