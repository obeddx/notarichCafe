import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { subDays, startOfWeek, startOfMonth } from "date-fns";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const { period, start, end } = req.query;
      let startDate = new Date();
      let endDate = new Date();

      if (period === "daily") {
        startDate = subDays(new Date(), 1);
      } else if (period === "weekly") {
        startDate = startOfWeek(new Date());
      } else if (period === "monthly") {
        startDate = startOfMonth(new Date());
      }

      // Jika ada parameter start dan end, gunakan itu
      if (start && end) {
        startDate = new Date(start as string);
        endDate = new Date(end as string);
      }

      // Ambil data top seller berdasarkan jumlah terjual
      const topSellers = await prisma.completedOrderItem.groupBy({
        by: ["menuId"],
        where: {
          order: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        _sum: {
          quantity: true,
        },
        orderBy: {
          _sum: {
            quantity: "desc",
          },
        },
        take: 5,
      });

      // Ambil nama menu
      const menuDetails = await Promise.all(
        topSellers.map(async (item) => {
          const menu = await prisma.menu.findUnique({
            where: { id: item.menuId },
          });
          return {
            menuName: menu?.name || "Unknown",
            totalSold: item._sum.quantity || 0,
          };
        })
      );

      // Hitung total pesanan
      const totalOrders = await prisma.completedOrder.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Hitung total pendapatan
      const totalRevenueResult = await prisma.completedOrder.aggregate({
        _sum: {
          total: true,
        },
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const totalRevenue = totalRevenueResult._sum.total || 0;

      res.status(200).json({ 
        topSellers: menuDetails, 
        totalOrders, 
        totalRevenue 
      });

    } catch (error) {
      console.error("Error fetching top sellers:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  } else {
    res.status(405).json({ error: "Method Not Allowed" });
  }
}