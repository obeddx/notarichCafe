// pages/api/item-sales.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Interface untuk respons API
interface ItemSalesResponse {
  menuName: string;
  category: string;
  quantity: number;
  totalCollected: number;
  hpp: number;
  discount: number;
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
      endDate = endDateQuery
        ? new Date(endDateQuery)
        : new Date(startDate);
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
    });

    // Agregasi data per item
    const aggregatedData: Record<number, ItemSalesResponse> = {};

    for (const order of orders) {
      const orderDiscount = Number(order.discountAmount || 0);
      const totalItems = order.orderItems.reduce((acc, item) => acc + item.quantity, 0);
      const discountPerItem = totalItems > 0 ? orderDiscount / totalItems : 0;

      for (const item of order.orderItems) {
        const menuId = item.menuId;
        if (!aggregatedData[menuId]) {
          aggregatedData[menuId] = {
            menuName: item.menu.name,
            category: item.menu.category,
            quantity: 0,
            totalCollected: 0,
            hpp: 0,
            discount: 0,
          };
        }

        const quantity = item.quantity;
        const itemSellingPrice = Number(item.menu.price);
        const itemHPP = Number(item.menu.hargaBakul);
        const itemTotal = itemSellingPrice * quantity;
        const itemCollected = itemTotal - discountPerItem * quantity; // Proporsional berdasarkan jumlah item
        const itemHPPValue = itemHPP * quantity;

        aggregatedData[menuId].quantity += quantity;
        aggregatedData[menuId].totalCollected += itemCollected;
        aggregatedData[menuId].hpp += itemHPPValue;
        aggregatedData[menuId].discount += discountPerItem * quantity;
      }
    }

    // Konversi ke array dan urutkan berdasarkan totalCollected
    const result: ItemSalesResponse[] = Object.values(aggregatedData).sort(
      (a, b) => b.totalCollected - a.totalCollected
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}