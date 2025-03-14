// pages/api/transactions.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Interface untuk respons API
interface TransactionItem {
  menuName: string;
  total: number;
}

interface TransactionDetail {
  time: Date;
  items: TransactionItem[];
  totalPrice: number;
}

interface TransactionSummary {
  totalTransactions: number;
  totalCollected: number;
  netSales: number;
}

interface TransactionResponse {
  summary: TransactionSummary;
  details: TransactionDetail[];
}

function getStartAndEndDates(period: string, dateString?: string): { startDate: Date; endDate: Date } {
  const date = dateString ? new Date(dateString) : new Date();
  let startDate: Date;
  let endDate: Date;
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
    const { period = "daily", date, startDate: startDateQuery, endDate: endDateQuery } = req.query as {
      period?: string;
      date?: string;
      startDate?: string;
      endDate?: string;
    };
    let startDate: Date;
    let endDate: Date;

    if (startDateQuery) {
      startDate = new Date(startDateQuery);
      endDate = endDateQuery ? new Date(endDateQuery) : new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      const dateStr = date || new Date().toISOString();
      ({ startDate, endDate } = getStartAndEndDates(period, dateStr));
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
    const netSales = orders.reduce(
      (acc, order) => acc + Number(order.total) - Number(order.discountAmount || 0),
      0
    );

    // Format detail transaksi
    const details: TransactionDetail[] = orders.map((order) => ({
      time: order.createdAt,
      items: order.orderItems.map((item) => ({
        menuName: item.menu.name,
        total: Number(item.menu.price) * item.quantity,
      })),
      totalPrice: Number(order.finalTotal),
    }));

    const summary: TransactionSummary = {
      totalTransactions,
      totalCollected,
      netSales,
    };

    const response: TransactionResponse = {
      summary,
      details,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    await prisma.$disconnect();
  }
}