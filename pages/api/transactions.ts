// pages/api/transactions.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getStartAndEndDates(period: string, dateString?: string): { startDate: Date; endDate: Date } {
  const date = dateString ? new Date(dateString) : new Date();
  let startDate: Date, endDate: Date;
  switch (period.toLowerCase()) {
    case "daily":
      startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);
      break;
    case "weekly": {
      const day = date.getDay();
      const diff = date.getDate() - (day === 0 ? 6 : day - 1);
      startDate = new Date(date.getFullYear(), date.getMonth(), diff);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
      break;
    }
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
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    let startDate: Date, endDate: Date;
    
    if (req.query.startDate) {
      startDate = new Date(req.query.startDate as string);
      endDate = req.query.endDate 
        ? new Date(req.query.endDate as string)
        : new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      const period = (req.query.period as string) || "daily";
      const date = req.query.date as string || new Date().toISOString();
      ({ startDate, endDate } = getStartAndEndDates(period, date));
    }

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
      orderBy: {
        createdAt: "asc",
      },
    });

    // Hitung summary
    const totalTransactions = orders.length;
    const totalCollected = orders.reduce((acc, order) => acc + Number(order.finalTotal), 0);
    const netSales = orders.reduce((acc, order) => acc + Number(order.total) - Number(order.discountAmount || 0), 0);

    // Format detail transaksi
    const details = orders.map(order => ({
      time: order.createdAt,
      items: order.orderItems.map(item => ({
        menuName: item.menu.name,
        total: item.menu.price * item.quantity,
      })),
      totalPrice: Number(order.finalTotal),
    }));

    const summary = {
      totalTransactions,
      totalCollected,
      netSales,
    };

    return res.status(200).json({
      summary,
      details,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}