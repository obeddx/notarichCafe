import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Interface untuk hasil aggregasi
interface AggregatedItem {
  menuName: string;
  category: string;
  quantity: number;
  total: number;
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
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
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

    // Query yang diperbaiki menggunakan CompletedOrderItem
    const orderItems = await prisma.completedOrderItem.findMany({
      where: {
        order: {
          createdAt: { gte: startDate, lt: endDate }
        }
      },
      include: {
        menu: true
      }
    });

    // Agregasi data dengan type safety
    const aggregatedData = orderItems.reduce((acc: Record<number, AggregatedItem>, item) => {
      const menuId = item.menuId;
      if (!acc[menuId]) {
        acc[menuId] = {
          menuName: item.menu.name,
          category: item.menu.category,
          quantity: 0,
          total: 0
        };
      }
      acc[menuId].quantity += item.quantity;
      acc[menuId].total += item.quantity * Number(item.menu.price);
      return acc;
    }, {});

    // Konversi ke array dan urutkan
    const result = Object.values(aggregatedData).sort((a, b) => b.total - a.total);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}