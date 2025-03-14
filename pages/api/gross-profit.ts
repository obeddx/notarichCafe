// pages/api/gross-profit.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Interface untuk respons API
interface GrossProfitResponse {
  summary: {
    explanation: string;
    grossSales: number;
    discounts: number;
    refunds: number;
    netSales: number;
    cogs: number;
  };
  details: {
    orderId: number;
    orderDate: string;
    menuName: string;
    sellingPrice: number;
    quantity: number;
    itemTotalSelling: number;
    hpp: number;
    itemTotalHPP: number;
  }[];
  ordersCount: number;
  startDate: string;
  endDate: string;
}

function getStartAndEndDates(period: string, dateString: string): { startDate: Date; endDate: Date } {
  const date = new Date(dateString);
  let startDate: Date;
  let endDate: Date;
  switch (period) {
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
      if (endDateQuery) {
        endDate = new Date(endDateQuery);
        endDate.setDate(endDate.getDate() + 1);
      } else {
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 1);
      }
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
        createdAt: "desc",
      },
    });

    const grossSales = orders.reduce((acc, order) => {
      return (
        acc +
        order.orderItems.reduce((itemAcc, item) => {
          const normalPrice = Number(item.menu.price) * Number(item.quantity);
          const hpp = Number(item.menu.hargaBakul) * Number(item.quantity);
          return itemAcc + (normalPrice - hpp);
        }, 0)
      );
    }, 0);

    const discounts = orders.reduce((acc, order) => {
      return acc + Number(order.discountAmount || 0);
    }, 0);

    const refunds = 0;

    const netSales = grossSales - discounts - refunds;

    const cogs = orders.reduce((acc, order) => {
      return (
        acc +
        order.orderItems.reduce((itemAcc, item) => {
          return itemAcc + Number(item.menu.hargaBakul) * Number(item.quantity);
        }, 0)
      );
    }, 0);

    const itemDetails: GrossProfitResponse["details"] = [];
    for (const order of orders) {
      for (const item of order.orderItems) {
        const sellingPrice = Number(item.menu.price);
        const hpp = Number(item.menu.hargaBakul);
        const quantity = item.quantity;
        const itemTotalSelling = sellingPrice * quantity;
        const itemTotalHPP = hpp * quantity;
        itemDetails.push({
          orderId: order.id,
          orderDate: order.createdAt.toISOString(),
          menuName: item.menu.name,
          sellingPrice,
          quantity,
          itemTotalSelling,
          hpp,
          itemTotalHPP,
        });
      }
    }

    const summary: GrossProfitResponse["summary"] = {
      explanation: "Gross Sales dihitung sebagai total penjualan normal dikurangi HPP (COGS). Net Sales dihitung sebagai Gross Sales dikurangi Discounts dan Refunds.",
      grossSales,
      discounts,
      refunds,
      netSales,
      cogs,
    };

    const response: GrossProfitResponse = {
      summary,
      details: itemDetails,
      ordersCount: orders.length,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error calculating gross profit:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}