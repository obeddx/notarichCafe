import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getStartAndEndDates(period: string, dateString: string) {
  const date = new Date(dateString);
  let startDate: Date, endDate: Date;

  switch (period) {
    case "daily":
      startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);
      break;
    case "weekly":
      // Asumsikan minggu dimulai dari Senin
      const day = date.getDay();
      const diff = date.getDate() - (day === 0 ? 6 : day - 1);
      startDate = new Date(date.setDate(diff));
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
      break;
    case "monthly":
      startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      endDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      break;
    case "yearly":
      startDate = new Date(date.getFullYear(), 0, 1);
      endDate = new Date(date.getFullYear() + 1, 0, 1);
      break;
    default:
      throw new Error("Invalid period");
  }

  return { startDate, endDate };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const { period = "daily", date = new Date().toISOString() } = req.query;

      const { startDate, endDate } = getStartAndEndDates(period as string, date as string);

      const result = await prisma.$queryRaw<
        {
          totalSales: number | null;
          transactions: number | null;
          totalHPP: number | null;
        }[]
      >`
        SELECT 
          SUM(total) as totalSales,
          COUNT(id) as transactions,
          SUM(hpp) as totalHPP
        FROM (
          SELECT 
            co.id,
            co.total,
            SUM(m.hargaBakul * ci.quantity) as hpp
          FROM CompletedOrder co
          JOIN CompletedOrderItem ci ON co.id = ci.orderId
          JOIN Menu m ON ci.menuId = m.id
          WHERE co.createdAt >= ${startDate} AND co.createdAt < ${endDate}
          GROUP BY co.id
        ) as subquery
      `;

      // Jika tidak ada data, set default 0
      const metricsRaw = result[0] || { totalSales: 0, transactions: 0, totalHPP: 0 };

      const metrics = {
        totalSales: Number(metricsRaw.totalSales) || 0,
        transactions: Number(metricsRaw.transactions) || 0,
        totalHPP: Number(metricsRaw.totalHPP) || 0,
      };

      const grossProfit = metrics.totalSales - metrics.totalHPP;

      res.status(200).json({
        ...metrics,
        grossProfit,
        netProfit: grossProfit, // Asumsi tidak ada biaya lain
      });
    } catch (error) {
      console.error("Error fetching sales metrics:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
