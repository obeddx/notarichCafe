// pages/api/gross-profit.ts
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
      const dateStr = (req.query.date as string) || new Date().toISOString();
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

    // Hitung Gross Sales: Total harga normal menu - HPP (tanpa diskon menu)
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

    // Hitung Discounts: Total semua diskon (scope MENU dan TOTAL)
    const discounts = orders.reduce((acc, order) => {
      return acc + Number(order.discountAmount || 0);
    }, 0);

    // Refunds tetap 0
    const refunds = 0;

    // Hitung Net Sales: Gross Sales - Discounts - Refunds
    const netSales = grossSales - discounts - refunds;

    // Hitung COGS: Total HPP (hargaBakul * quantity)
    const cogs = orders.reduce((acc, order) => {
      return (
        acc +
        order.orderItems.reduce((itemAcc, item) => {
          return itemAcc + Number(item.menu.hargaBakul) * Number(item.quantity);
        }, 0)
      );
    }, 0);

    // Siapkan detail item untuk referensi (meskipun tidak ditampilkan di tabel utama)
    const itemDetails = [];
    for (const order of orders) {
      for (const item of order.orderItems) {
        const sellingPrice = Number(item.menu.price);
        const hpp = Number(item.menu.hargaBakul);
        const quantity = item.quantity;
        const itemTotalSelling = sellingPrice * quantity;
        const itemTotalHPP = hpp * quantity;
        itemDetails.push({
          orderId: order.id,
          orderDate: order.createdAt,
          menuName: item.menu.name,
          sellingPrice,
          quantity,
          itemTotalSelling,
          hpp,
          itemTotalHPP,
        });
      }
    }

    const summary = {
      explanation: "Gross Sales dihitung sebagai total penjualan normal dikurangi HPP (COGS). Net Sales dihitung sebagai Gross Sales dikurangi Discounts dan Refunds.",
      grossSales,
      discounts,
      refunds,
      netSales,
      cogs,
    };

    return res.status(200).json({
      summary,
      details: itemDetails,
      ordersCount: orders.length,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error("Error calculating gross profit:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}