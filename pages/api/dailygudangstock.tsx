// pages/api/dailyingredientstock.tsx

import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { date, start, end } = req.query;

  // Validasi input
  if (!date && !start) {
    return res.status(400).json({
      error: "Query parameter 'date' atau 'start' diperlukan.",
    });
  }

  let startDate: Date;
  let endDate: Date;

  if (start && end) {
    // Jika rentang tanggal diberikan
    startDate = new Date(start as string);
    startDate.setHours(0, 0, 0, 0);

    endDate = new Date(end as string);
    endDate.setHours(23, 59, 59, 999);
  } else if (date) {
    // Jika hanya 1 tanggal diberikan
    startDate = new Date(date as string);
    startDate.setHours(0, 0, 0, 0);

    endDate = new Date(date as string);
    endDate.setHours(23, 59, 59, 999);
  } else {
    return res.status(400).json({
      error: "Query parameter tidak valid.",
    });
  }

  try {
    // Mengambil dan menjumlahkan data berdasarkan gudangId
    const data = await prisma.dailyGudangStock.groupBy({
      by: ["gudangId", "gudangName"],
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        start: true,
        stockIn: true,
        used: true,
        wasted: true,
        stock: true,
      },
      orderBy: {
        gudangId: "asc",
      },
    });

    // Format hasil agar sesuai dengan struktur sebelumnya
    const formattedData = data.map((item) => ({
      gudangId: item.gudangId,
      gudangName: item.gudangName,
      start: item._sum.start || 0,
      stockIn: item._sum.stockIn || 0,
      used: item._sum.used || 0,
      wasted: item._sum.wasted || 0,
      stock: item._sum.stock || 0,
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    console.error("Error retrieving daily ingredient stock:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
