// pages/api/tax-report.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface AggregatedTax {
  name: string;
  taxRate: string;
  taxableAmount: number;
  taxCollected: number;
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

    // Ambil semua pajak aktif untuk referensi
    const taxes = await prisma.tax.findMany({
      where: { isActive: true },
    });

    // Ambil semua order dalam periode tertentu
    const orders = await prisma.completedOrder.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
        taxAmount: { gt: 0 }, // Hanya ambil order yang memiliki pajak
      },
      include: {
        orderItems: {
          include: {
            menu: true,
          },
        },
      },
    });

    // Agregasi data per pajak
    const aggregatedData: Record<number, AggregatedTax> = {};

    for (const order of orders) {
      // Asumsikan hanya satu pajak aktif per periode untuk simplifikasi
      const activeTax = taxes.find(t => t.isActive); // Ambil pajak aktif pertama
      if (!activeTax) continue;

      const taxId = activeTax.id;
      if (!aggregatedData[taxId]) {
        aggregatedData[taxId] = {
          name: activeTax.name,
          taxRate: `${activeTax.value}%`,
          taxableAmount: 0,
          taxCollected: 0,
        };
      }

      // Taxable Amount: Total harga normal dikurangi diskon
      const taxableAmount = order.orderItems.reduce((acc, item) => {
        return acc + Number(item.menu.price) * item.quantity;
      }, 0) - Number(order.discountAmount || 0);

      aggregatedData[taxId].taxableAmount += taxableAmount;
      aggregatedData[taxId].taxCollected += Number(order.taxAmount || 0);
    }

    // Konversi ke array dan urutkan berdasarkan taxCollected
    const result = Object.values(aggregatedData).sort((a, b) => b.taxCollected - a.taxCollected);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}