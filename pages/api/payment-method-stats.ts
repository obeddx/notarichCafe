import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface PaymentMethodData {
  paymentMethod: string;
  count: number;
  totalRevenue: number;
}

function getStartAndEndDates(period: string, dateString?: string) {
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
      const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday start
      startDate = new Date(date.setDate(diff));
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
    const { period = "daily", date } = req.query;
    const { startDate, endDate } = getStartAndEndDates(
      period as string, 
      date ? date as string : undefined
    );

    // Convert dates to ISO string for Prisma
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    const result = await prisma.completedOrder.groupBy({
      by: ['paymentMethod'],
      where: {
        createdAt: {
          gte: startISO,
          lt: endISO
        },
        paymentMethod: {
          not: null
        }
      },
      _count: {
        paymentMethod: true
      },
      _sum: {
        total: true
      },
      orderBy: {
        _count: {
          paymentMethod: 'desc'
        }
      }
    });

    const formattedResult = result.map(item => ({
      paymentMethod: item.paymentMethod || 'Unknown',
      count: item._count.paymentMethod,
      totalRevenue: item._sum.total || 0
    }));

    res.status(200).json(formattedResult);
  } catch (error) {
    console.error("Error fetching payment method stats:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}