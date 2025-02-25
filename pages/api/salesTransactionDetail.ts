// pages/api/salesTransactionDetail.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getStartOfISOWeek(isoWeek: string): Date {
  const [yearStr, weekStr] = isoWeek.split("-W");
  const year = Number(yearStr);
  const week = Number(weekStr);
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = new Date(simple);
  if (dow === 0) {
    ISOweekStart.setDate(simple.getDate() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() - dow + 1);
  }
  return ISOweekStart;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const { date, period } = req.query;
    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }

    let startDate: Date;
    let endDate: Date;

    if (period === "daily") {
      startDate = new Date(date as string);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else if (period === "weekly") {
      startDate = getStartOfISOWeek(date as string);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
    } else if (period === "monthly") {
      const [year, month] = (date as string).split("-");
      startDate = new Date(Number(year), Number(month) - 1, 1);
      endDate = new Date(Number(year), Number(month), 1);
    } else if (period === "yearly") {
      const year = Number(date as string);
      startDate = new Date(year, 0, 1);
      endDate = new Date(year + 1, 0, 1);
    } else {
      startDate = new Date(date as string);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    }

    try {
      const orders = await prisma.completedOrder.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lt: endDate,
          },
        },
        include: {
          orderItems: {
            include: {
              menu: true,
            },
          },
        },
      });

      const transactionCount = orders.length;
      let netSales = 0;
      orders.forEach((order) => {
        netSales += Number(order.finalTotal);
      });
      const salesPerTransaction =
        transactionCount > 0 ? netSales / transactionCount : 0;

      const detailsMap = new Map<
        number,
        { menuName: string; sellingPrice: number; quantity: number; totalSales: number }
      >();

      orders.forEach((order) => {
        order.orderItems.forEach((item) => {
          const key = item.menu.id;
          if (detailsMap.has(key)) {
            const existing = detailsMap.get(key)!;
            existing.quantity += item.quantity;
            existing.totalSales += item.menu.price * item.quantity;
          } else {
            detailsMap.set(key, {
              menuName: item.menu.name,
              sellingPrice: item.menu.price,
              quantity: item.quantity,
              totalSales: item.menu.price * item.quantity,
            });
          }
        });
      });
      const details = Array.from(detailsMap.values());

      return res.status(200).json({
        summary: { netSales, transactionCount, salesPerTransaction },
        details,
      });
    } catch (error) {
      console.error("Error fetching sales detail:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
  return res.status(405).json({ error: "Method not allowed" });
}