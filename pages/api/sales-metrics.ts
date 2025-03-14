// pages/api/sales-metrics.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface Metrics {
  totalSales: number;
  transactions: number;
  grossProfit: number;
  netProfit: number;
  discounts: number;
  tax: number;
  gratuity: number;
}

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  discountAmount: number;
  menu: {
    id: number;
    name: string;
    price: number;
    hargaBakul: number;
  };
}

interface Order {
  id: number;
  createdAt: Date;
  total: number;
  discountAmount: number;
  taxAmount: number;
  gratuityAmount: number;
  finalTotal: number;
  orderItems: OrderItem[];
}

function getStartAndEndDates(period: string, dateString: string): { startDate: Date; endDate: Date } {
  const date = new Date(dateString);
  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case "daily":
    case "daily-prev":
      startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);
      break;
    case "weekly":
    case "weekly-prev":
      const day = date.getDay();
      const diff = date.getDate() - (day === 0 ? 6 : day - 1);
      startDate = new Date(date.getFullYear(), date.getMonth(), diff);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
      break;
    case "monthly":
    case "monthly-prev":
      startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      endDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      break;
    case "yearly":
    case "yearly-prev":
      startDate = new Date(date.getFullYear(), 0, 1);
      endDate = new Date(date.getFullYear() + 1, 0, 1);
      break;
    default:
      throw new Error("Invalid period");
  }
  return { startDate, endDate };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const { period = "daily", date = new Date().toISOString() } = req.query;
      const { startDate, endDate } = getStartAndEndDates(period as string, date as string);

      const orders: Order[] = await prisma.completedOrder.findMany({
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

      // Total Sales: menggunakan finalTotal
      const totalSales = orders.reduce((acc, order) => acc + Number(order.finalTotal), 0);

      // Transactions: jumlah order
      const transactions = orders.length;

      // Gross Profit (Gross Sales): (Menu.price - Menu.hargaBakul) * quantity
      const grossProfit = orders.reduce((acc, order) => {
        return (
          acc +
          order.orderItems.reduce((itemAcc, item) => {
            const sellingPrice = Number(item.menu.price);
            const hpp = Number(item.menu.hargaBakul);
            return itemAcc + (sellingPrice - hpp) * item.quantity;
          }, 0)
        );
      }, 0);

      // Discounts: total discountAmount
      const discounts = orders.reduce((acc, order) => acc + Number(order.discountAmount || 0), 0);

      // Tax: total taxAmount
      const tax = orders.reduce((acc, order) => acc + Number(order.taxAmount || 0), 0);

      // Gratuity: total gratuityAmount
      const gratuity = orders.reduce((acc, order) => acc + Number(order.gratuityAmount || 0), 0);

      // Net Profit (Net Sales): Gross Sales - Discounts - Refunds (Refunds = 0)
      const netProfit = grossProfit - discounts;

      const response: Metrics = {
        totalSales,
        transactions,
        grossProfit,
        netProfit,
        discounts,
        tax,
        gratuity,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("Error fetching sales metrics:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}