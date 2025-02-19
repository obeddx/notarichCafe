// File: pages/api/salesData.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SalesData = { date: string; total: number };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const { period, start, end } = req.query;
    try {
      let salesData: SalesData[] = [];
      let startDate = start ? new Date(start as string) : null;
      let endDate = end ? new Date(end as string) : null;

      if (period === "daily") {
        const rawData: any[] = await prisma.$queryRaw`
          SELECT DATE(createdAt) as date, SUM(total) as total
          FROM CompletedOrder
          WHERE (${startDate} IS NULL OR createdAt >= ${startDate})
            AND (${endDate} IS NULL OR createdAt <= ${endDate})
          GROUP BY DATE(createdAt)
          ORDER BY DATE(createdAt) ASC
        `;
        salesData = rawData.map((item) => ({
          date: item.date,
          total: Number(item.total),
        }));
      } else if (period === "weekly") {
        const rawData: any[] = await prisma.$queryRaw`
          SELECT YEAR(createdAt) as year, WEEK(createdAt) as week, SUM(total) as total
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
        const rawData: any[] = await prisma.$queryRaw`
          SELECT YEAR(createdAt) as year, MONTH(createdAt) as month, SUM(total) as total
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
        const rawData: any[] = await prisma.$queryRaw`
          SELECT YEAR(createdAt) as year, SUM(total) as total
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
  return res.status(405).json({ error: "Method not allowed" });
}
