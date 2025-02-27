// pages/api/category-sales.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface AggregatedCategory {
  category: string;
  itemSold: number;
  totalCollected: number;
  discount: number;
  gratuity: number;
  netSales: number;
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

    // Agregasi data per kategori
    const aggregatedData: Record<string, AggregatedCategory> = {};

    for (const order of orders) {
      const orderTotal = Number(order.finalTotal);
      const orderDiscount = Number(order.discountAmount || 0);
      const orderGratuity = Number(order.gratuityAmount || 0);
      const totalItems = order.orderItems.reduce((acc, item) => acc + item.quantity, 0);
      const discountPerItem = totalItems > 0 ? orderDiscount / totalItems : 0;
      // Net sales dihitung sebagai totalCollected - discount untuk konsistensi dengan item-sales (tanpa HPP)

      for (const item of order.orderItems) {
        const category = item.menu.category;
        if (!aggregatedData[category]) {
          aggregatedData[category] = {
            category,
            itemSold: 0,
            totalCollected: 0,
            discount: 0,
            gratuity: orderGratuity,
            netSales: 0,
          };
        }

        const quantity = item.quantity;
        const itemSellingPrice = Number(item.menu.price);
        const itemTotal = itemSellingPrice * quantity;
        const itemCollected = (itemTotal - discountPerItem * quantity); // Proporsional berdasarkan finalTotal

        aggregatedData[category].itemSold += quantity;
        aggregatedData[category].totalCollected += itemCollected;
        aggregatedData[category].discount += discountPerItem * quantity;
        aggregatedData[category].gratuity = orderGratuity; // Gratuity dipertahankan per pesanan
        aggregatedData[category].netSales += itemCollected - (discountPerItem * quantity);
      }
    }

    // Konversi ke array dan urutkan berdasarkan totalCollected
    const result = Object.values(aggregatedData).sort((a, b) => b.totalCollected - a.totalCollected);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    await prisma.$disconnect();
  }
}