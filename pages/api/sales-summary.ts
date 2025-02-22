// pages/api/sales-summary.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Fungsi helper untuk menentukan start dan end date berdasarkan periode
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
      // Misal minggu dimulai dari Senin
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
    // Jika ada query startDate (custom range)
    if (req.query.startDate) {
      startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) {
        endDate = new Date(req.query.endDate as string);
        // Jika ingin menyertakan tanggal endDate secara penuh, bisa tambahkan 1 hari.
        endDate.setDate(endDate.getDate() + 1);
      } else {
        // Jika hanya A saja, asumsikan 1 hari
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 1);
      }
    } else {
      // Gunakan parameter period & date (default: daily)
      const period = (req.query.period as string) || "daily";
      const dateString = (req.query.date as string) || new Date().toISOString();
      ({ startDate, endDate } = getStartAndEndDates(period, dateString));
    }

    // Ambil order dari tabel CompletedOrder sesuai rentang tanggal
    const orders = await prisma.completedOrder.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    // Perhitungan
    const grossSales = orders.reduce((acc, order) => acc + Number(order.total), 0);
    const discounts = 0; // hardcode
    const refunds = 0;   // hardcode
    const netSales = grossSales - discounts - refunds;
    const gratuity = 0;  // belum ada
    const tax = 0;       // belum ada

    // Hitung rounding sehingga 2 digit terakhir menjadi 0
    const remainder = netSales % 100;
    const rounding = remainder === 0 ? 0 : 100 - remainder;
    const totalCompleted = netSales + rounding;

    return res.status(200).json({
      grossSales,
      discounts,
      refunds,
      netSales,
      gratuity,
      tax,
      rounding,
      totalCompleted,
      ordersCount: orders.length,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error("Error in sales-summary:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
