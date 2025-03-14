// pages/api/salesData.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SalesData {
  date: string;
  total: number;
}

interface SalesRawData {
  date?: Date; // Untuk daily
  year: number; // Untuk weekly, monthly, yearly
  week?: number; // Untuk weekly
  month?: number; // Untuk monthly
  total: bigint | number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { period, start, end } = req.query;

  try {
    let salesData: SalesData[] = [];
    const startDate = start ? new Date(start as string) : null;
    const endDate = end ? new Date(end as string) : null;

    if (period === "daily") {
      const rawData: SalesRawData[] = await prisma.$queryRaw`
        SELECT DATE(createdAt) as date, SUM(finalTotal) as total
        FROM CompletedOrder
        WHERE (${startDate} IS NULL OR createdAt >= ${startDate})
          AND (${endDate} IS NULL OR createdAt <= ${endDate})
        GROUP BY DATE(createdAt)
        ORDER BY DATE(createdAt) ASC
      `;
      salesData = rawData.map((item) => ({
        date: item.date!.toISOString().split("T")[0],
        total: Number(item.total),
      }));
    } else if (period === "weekly") {
      const rawData: SalesRawData[] = await prisma.$queryRaw`
        SELECT YEAR(createdAt) as year, WEEK(createdAt) as week, SUM(finalTotal) as total
        FROM CompletedOrder
        WHERE (${startDate} IS NULL OR createdAt >= ${startDate})
          AND (${endDate} IS NULL OR createdAt <= ${endDate})
        GROUP BY YEAR(createdAt), WEEK(createdAt)
        ORDER BY YEAR(createdAt), WEEK(createdAt) ASC
      `;
      salesData = rawData.map((item) => ({
        date: `${item.year}-W${String(item.week).padStart(2, "0")}`,
        total: Number(item.total),
      }));
    } else if (period === "monthly") {
      const rawData: SalesRawData[] = await prisma.$queryRaw`
        SELECT YEAR(createdAt) as year, MONTH(createdAt) as month, SUM(finalTotal) as total
        FROM CompletedOrder
        WHERE (${startDate} IS NULL OR createdAt >= ${startDate})
          AND (${endDate} IS NULL OR createdAt <= ${endDate})
        GROUP BY YEAR(createdAt), MONTH(createdAt)
        ORDER BY YEAR(createdAt), MONTH(createdAt) ASC
      `;
      salesData = rawData.map((item) => ({
        date: `${item.year}-${String(item.month).padStart(2, "0")}`,
        total: Number(item.total),
      }));
    } else if (period === "yearly") {
      const rawData: SalesRawData[] = await prisma.$queryRaw`
        SELECT YEAR(createdAt) as year, SUM(finalTotal) as total
        FROM CompletedOrder
        WHERE (${startDate} IS NULL OR createdAt >= ${startDate})
          AND (${endDate} IS NULL OR createdAt <= ${endDate})
        GROUP BY YEAR(createdAt)
        ORDER BY YEAR(createdAt) ASC
      `;
      salesData = rawData.map((item) => ({
        date: `${item.year}`,
        total: Number(item.total),
      }));
    } else {
      return res.status(400).json({ error: "Invalid period" });
    }

    return res.status(200).json(salesData);
  } catch (error) {
    console.error("Error fetching sales data:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}