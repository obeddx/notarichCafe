// pages/api/sales-summary.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getStartAndEndDates(period: string, dateString: string): { startDate: Date; endDate: Date } {
  const date = new Date(dateString);
  let startDate: Date, endDate: Date;
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
    let startDate: Date, endDate: Date;
    if (req.query.startDate) {
      startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) {
        endDate = new Date(req.query.endDate as string);
        endDate.setDate(endDate.getDate() + 1);
      } else {
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 1);
      }
    } else {
      const period = (req.query.period as string) || "daily";
      const dateString = (req.query.date as string) || new Date().toISOString();
      ({ startDate, endDate } = getStartAndEndDates(period, dateString));
    }

    // Ambil order dari tabel CompletedOrder beserta orderItems dan menu
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

    // Hitung Gross Sales: total harga normal menu - HPP (tanpa diskon menu)
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

    // Hitung Discounts: total semua diskon (scope MENU dan TOTAL)
    const discounts = orders.reduce((acc, order) => {
      return acc + Number(order.discountAmount || 0);
    }, 0);

    // Refunds tetap 0 karena belum ada
    const refunds = 0;

    // Hitung Net Sales: Gross Sales - Discounts - Refunds
    const netSales = grossSales - discounts - refunds;

    // Hitung Tax dan Gratuity dari CompletedOrder
    const tax = orders.reduce((acc, order) => acc + Number(order.taxAmount || 0), 0);
    const gratuity = orders.reduce((acc, order) => acc + Number(order.gratuityAmount || 0), 0);

    // Hitung Rounding: membulatkan dua digit terakhir ke 0
    const remainder = netSales % 100;
    const rounding = remainder === 0 ? 0 : 100 - remainder;

    // Hitung Total Collected: Net Sales + Gratuity + Tax + Rounding
    const totalCollected = netSales + gratuity + tax + rounding;

    return res.status(200).json({
      grossSales,
      discounts,
      refunds,
      netSales,
      gratuity,
      tax,
      rounding,
      totalCollected,
      ordersCount: orders.length,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error("Error in sales-summary:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}