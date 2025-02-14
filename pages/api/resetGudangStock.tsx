// pages/api/resetDailyStockGudang.ts
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

    // Ambil semua record gudang
    const gudangs = await prisma.gudang.findMany();

    for (const gudang of gudangs) {
      // Simpan snapshot harian ke tabel DailyGudangStock
      await prisma.dailyGudangStock.create({
        data: {
          date: today,
          gudangId: gudang.id,
          gudangName: gudang.name,
          start: gudang.start,
          stockIn: gudang.stockIn,
          used: gudang.used,
          wasted: gudang.wasted,
          stock: gudang.stock,
          stockMin: gudang.stockMin,
        },
      });

      // Reset data gudang untuk hari baru:
      // Jadikan stok akhir hari ini sebagai stok awal hari berikutnya,
      // dan reset transaksi harian ke 0.
      await prisma.gudang.update({
        where: { id: gudang.id },
        data: {
          start: gudang.stock,
          stockIn: 0,
          used: 0,
          wasted: 0,
          stock: gudang.stock,
          // stockMin tetap sama, dan stock bisa disesuaikan jika diperlukan.
        },
      });
    }

    return res
      .status(200)
      .json({ message: "Daily gudang stock reset successful and history saved." });
  } catch (error) {
    console.error("Error resetting daily gudang stock:", error);
    return res
      .status(500)
      .json({ message: "Failed to reset daily gudang stock" });
  }
}
