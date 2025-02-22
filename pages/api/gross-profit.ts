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
    // Gunakan custom range jika tersedia, atau period & date
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

    // Ambil order dari CompletedOrder beserta orderItems dan relasinya ke Menu
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

    // Hitung total penjualan (sebagai gross penjualan awal)
    let totalSelling = 0;
    // Hitung total HPP (COGS) berdasarkan hargaBakul dan quantity
    let totalHPP = 0;
    const itemDetails = [];

    for (const order of orders) {
      for (const item of order.orderItems) {
        const sellingPrice = Number(item.menu.price) || 0;
        const hpp = Number(item.menu.hargaBakul) || 0;
        const quantity = item.quantity;
        const itemTotalSelling = sellingPrice * quantity;
        const itemTotalHPP = hpp * quantity;
        totalSelling += itemTotalSelling;
        totalHPP += itemTotalHPP;
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

    // Untuk saat ini, Discounts dan Refunds = 0, sehingga:
    const netSales = totalSelling; // Net Sales = Gross Sales (sementara)
    // Gross Profit (yang ingin kita tampilkan sebagai Gross Sales) = Net Sales - COGS
    const grossProfit = netSales - totalHPP;

    // Karena nantinya Net Sales akan dihitung sebagai Gross Profit - Discounts - Refunds,
    // untuk sekarang kita asumsikan Net Sales sama dengan Gross Profit (karena Discounts dan Refunds 0)
    const netSalesFinal = grossProfit;

    // Hitung persentase COGS terhadap Net Sales
    const cogsPercentage = netSalesFinal > 0 ? ((totalHPP / netSalesFinal) * 100).toFixed(2) : "0.00";

    // Buat summary dengan menggantikan Gross Sales dengan nilai Gross Profit
    const summary = {
      explanation: "Gross Sales dihitung sebagai Gross Profit, yaitu Net Sales (total penjualan) dikurangi total HPP (COGS).",
      grossSales: grossProfit, // Ini adalah nilai Gross Profit yang akan ditampilkan sebagai Gross Sales
      cogs: totalHPP,
      netSales: netSalesFinal,
    };

    return res.status(200).json({
      summary,
      details: itemDetails,
      ordersCount: orders.length,
      startDate,
      endDate,
      netSales,
      cogs: totalHPP,
      grossProfit, // Meski tidak akan ditampilkan, kita kirimkan juga untuk referensi
      cogsPercentage,
    });
  } catch (error) {
    console.error("Error calculating gross profit:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
