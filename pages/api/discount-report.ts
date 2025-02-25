// pages/api/discount-report.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface AggregatedDiscount {
  name: string;
  discount: string;
  count: number;
  grossDiscount: number;
  netDiscount: number;
}

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

    // Ambil semua order dengan diskon dalam periode tertentu
    const orders = await prisma.completedOrder.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
        discountId: { not: null }, // Hanya ambil order yang memiliki diskon
      },
      include: {
        discount: true,
        orderItems: {
          include: {
            menu: true,
          },
        },
      },
    });

    // Agregasi data per diskon
    const aggregatedData: Record<number, AggregatedDiscount> = {};

    for (const order of orders) {
      const discountId = order.discountId!;
      if (!aggregatedData[discountId]) {
        aggregatedData[discountId] = {
          name: order.discount!.name,
          discount: order.discount!.type === "PERCENTAGE" ? `${order.discount!.value}%` : `Rp ${order.discount!.value}`,
          count: 0,
          grossDiscount: 0,
          netDiscount: 0,
        };
      }

      aggregatedData[discountId].count += 1;

      // Gross Discount: Total diskon sebelum penyesuaian (berdasarkan nilai diskon)
      const discountValue = order.discount!.type === "PERCENTAGE"
        ? (order.discount!.value / 100) * order.orderItems.reduce((acc, item) => acc + Number(item.menu.price) * item.quantity, 0)
        : order.discount!.value;
      aggregatedData[discountId].grossDiscount += discountValue;

      // Net Discount: Total diskon aktual dari order (discountAmount)
      aggregatedData[discountId].netDiscount += Number(order.discountAmount || 0);
    }

    // Konversi ke array dan urutkan berdasarkan netDiscount
    const result = Object.values(aggregatedData).sort((a, b) => b.netDiscount - a.netDiscount);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}