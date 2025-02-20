import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type GrossMarginData = { date: string; grossMargin: number };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const { period, start, end } = req.query;

    try {
      let grossMarginData: GrossMarginData[] = [];
      let startDate = start ? new Date(start as string) : null;
      let endDate = end ? new Date(end as string) : null;

      if (period === "daily") {
        const rawData: any[] = await prisma.$queryRaw`
          SELECT 
            DATE(co.createdAt) as date,
            SUM(co.total) as netSales,
            SUM(m.hargaBakul * ci.quantity) as hpp
          FROM CompletedOrder co
          JOIN CompletedOrderItem ci ON co.id = ci.orderId
          JOIN Menu m ON ci.menuId = m.id
          WHERE (${startDate} IS NULL OR co.createdAt >= ${startDate})
            AND (${endDate} IS NULL OR co.createdAt <= ${endDate})
          GROUP BY DATE(co.createdAt)
          ORDER BY DATE(co.createdAt) ASC
        `;
        grossMarginData = rawData.map((item) => ({
          date: item.date,
          grossMargin:
            (Number(item.netSales) - Number(item.hpp)) / Number(item.netSales) * 100,
        }));
      } else if (period === "weekly") {
        const rawData: any[] = await prisma.$queryRaw`
          SELECT 
            YEAR(co.createdAt) as year,
            WEEK(co.createdAt) as week,
            SUM(co.total) as netSales,
            SUM(m.hargaBakul * ci.quantity) as hpp
          FROM CompletedOrder co
          JOIN CompletedOrderItem ci ON co.id = ci.orderId
          JOIN Menu m ON ci.menuId = m.id
          WHERE (${startDate} IS NULL OR co.createdAt >= ${startDate})
            AND (${endDate} IS NULL OR co.createdAt <= ${endDate})
          GROUP BY YEAR(co.createdAt), WEEK(co.createdAt)
          ORDER BY YEAR(co.createdAt), WEEK(co.createdAt) ASC
        `;
        grossMarginData = rawData.map((item) => ({
          date: `${item.year}-W${String(item.week).padStart(2, "0")}`,
          grossMargin:
            ((Number(item.netSales) - Number(item.hpp)) / Number(item.netSales)) * 100,
        }));
      } else if (period === "monthly") {
        const rawData: any[] = await prisma.$queryRaw`
          SELECT 
            YEAR(co.createdAt) as year,
            MONTH(co.createdAt) as month,
            SUM(co.total) as netSales,
            SUM(m.hargaBakul * ci.quantity) as hpp
          FROM CompletedOrder co
          JOIN CompletedOrderItem ci ON co.id = ci.orderId
          JOIN Menu m ON ci.menuId = m.id
          WHERE (${startDate} IS NULL OR co.createdAt >= ${startDate})
            AND (${endDate} IS NULL OR co.createdAt <= ${endDate})
          GROUP BY YEAR(co.createdAt), MONTH(co.createdAt)
          ORDER BY YEAR(co.createdAt), MONTH(co.createdAt) ASC
        `;
        grossMarginData = rawData.map((item) => ({
          date: `${item.year}-${String(item.month).padStart(2, "0")}`,
          grossMargin: Number(
            ((Number(item.netSales) - Number(item.hpp)) / Number(item.netSales)) * 100
          ),
        }));
      } else if (period === "yearly") {
        const rawData: any[] = await prisma.$queryRaw`
          SELECT 
            YEAR(co.createdAt) as year,
            SUM(co.total) as netSales,
            SUM(m.hargaBakul * ci.quantity) as hpp
          FROM CompletedOrder co
          JOIN CompletedOrderItem ci ON co.id = ci.orderId
          JOIN Menu m ON ci.menuId = m.id
          WHERE (${startDate} IS NULL OR co.createdAt >= ${startDate})
            AND (${endDate} IS NULL OR co.createdAt <= ${endDate})
          GROUP BY YEAR(co.createdAt)
          ORDER BY YEAR(co.createdAt) ASC
        `;
        grossMarginData = rawData.map((item) => ({
          date: `${item.year}`,
          grossMargin:
            (Number(item.netSales) - Number(item.hpp)) / Number(item.netSales) * 100,
        }));
      } else {
        return res.status(400).json({ error: "Invalid period" });
      }

      return res.status(200).json(grossMarginData);
    } catch (error) {
      console.error("Error fetching gross margin data:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}