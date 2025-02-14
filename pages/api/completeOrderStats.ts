// pages/api/completeOrderStats.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Data =
  | {
      orderCount: number;
      totalRevenue: number;
    }
  | {
      error: string;
    };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    // Menghitung jumlah pesanan berdasarkan field originalId
    const orderCount = await prisma.completedOrder.count();

    // Menjumlahkan total pendapatan dari field total
    const revenueAggregate = await prisma.completedOrder.aggregate({
      _sum: { total: true },
    });
    const totalRevenue = revenueAggregate._sum.total || 0;

    res.status(200).json({ orderCount, totalRevenue });
  } catch (error) {
    console.error("Error fetching stats", error);
    res.status(500).json({ error: "Error fetching stats" });
  }
}
