import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const lastMonthDate = new Date(currentDate);
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
      const lastMonth = lastMonthDate.getMonth() + 1;
      const lastMonthYear = lastMonthDate.getFullYear();

      const thisMonthRevenue = await prisma.completedOrder.aggregate({
        _sum: {
          total: true,
        },
        where: {
          createdAt: {
            gte: new Date(`${currentYear}-${currentMonth}-01`),
            lt: new Date(`${currentYear}-${currentMonth + 1}-01`),
          },
        },
      });

      const lastMonthRevenue = await prisma.completedOrder.aggregate({
        _sum: {
          total: true,
        },
        where: {
          createdAt: {
            gte: new Date(`${lastMonthYear}-${lastMonth}-01`),
            lt: new Date(`${lastMonthYear}-${lastMonth + 1}-01`),
          },
        },
      });

      const data = [
        {
          month: "Bulan Ini",
          thisMonth: thisMonthRevenue._sum.total || 0,
          lastMonth: lastMonthRevenue._sum.total || 0,
        },
      ];

      res.status(200).json(data);
    } catch (error) {
      console.error("Error fetching revenue comparison:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  } else {
    res.status(405).json({ error: "Method Not Allowed" });
  }
}