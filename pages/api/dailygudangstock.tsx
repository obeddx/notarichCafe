// pages/api/dailygudangstock.tsx

import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { startDate, endDate } = req.query;

  if (!startDate || typeof startDate !== "string") {
    return res.status(400).json({ error: "Query parameter 'startDate' diperlukan." });
  }

  // Parsing startDate dan set ke awal hari (00:00:00.000)
  const parsedStartDate = new Date(startDate);
  parsedStartDate.setHours(0, 0, 0, 0);

  // Jika endDate tidak diberikan, gunakan startDate sebagai endDate dengan set ke akhir hari (23:59:59.999)
  let parsedEndDate: Date;
  if (!endDate || typeof endDate !== "string") {
    parsedEndDate = new Date(startDate);
    parsedEndDate.setHours(23, 59, 59, 999);
  } else {
    parsedEndDate = new Date(endDate);
    parsedEndDate.setHours(23, 59, 59, 999);
  }

  try {
    // Query untuk mendapatkan data awal (start) dari hari pertama dengan menggunakan rentang waktu
    const startStocks = await prisma.dailyGudangStock.groupBy({
      by: ['gudangId', 'gudangName'],
      where: {
        date: {
          gte: parsedStartDate,
          lte: new Date(
            parsedStartDate.getFullYear(),
            parsedStartDate.getMonth(),
            parsedStartDate.getDate(),
            23, 59, 59, 999
          )
        },
        gudang: { isActive: true }
      },
      _sum: {
        start: true
      }
    });

    // Query untuk mendapatkan agregasi stockIn, used, dan wasted untuk seluruh periode
    const periodStocks = await prisma.dailyGudangStock.groupBy({
      by: ['gudangId', 'gudangName'],
      where: {
        date: {
          gte: parsedStartDate,
          lte: parsedEndDate,
        },
        gudang: { isActive: true }
      },
      _sum: {
        stockIn: true,
        used: true,
        wasted: true,
      },
    });

    // Gabungkan data dan hitung stock akhir
    const result = periodStocks.map(periodStock => {
      const startStock = startStocks.find(s => s.gudangId === periodStock.gudangId);
      
      const start = startStock?._sum.start || 0;
      const stockIn = periodStock._sum.stockIn || 0;
      const used = periodStock._sum.used || 0;
      const wasted = periodStock._sum.wasted || 0;
      const stock = start + stockIn - used - wasted;

      return {
        gudang: {
          id: periodStock.gudangId,
          name: periodStock.gudangName
        },
        start,
        stockIn,
        used,
        wasted,
        stock
      };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error retrieving daily gudang stock:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}