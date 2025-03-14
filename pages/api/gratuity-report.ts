// pages/api/gratuity-report.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Interface untuk respons API
interface GratuityReportResponse {
  name: string;
  rate: string;
  gratuityCollected: number;
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
      endDate = endDateQuery
        ? new Date(endDateQuery)
        : new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      const dateStr = date || new Date().toISOString();
      ({ startDate, endDate } = getStartAndEndDates(period, dateStr));
    }

    // Ambil semua gratuity aktif untuk referensi
    const gratuities = await prisma.gratuity.findMany({
      where: { isActive: true },
    });

    // Ambil semua order dalam periode tertentu
    const orders = await prisma.completedOrder.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
        gratuityAmount: { gt: 0 }, // Hanya ambil order yang memiliki gratuity
      },
      include: {
        orderItems: {
          include: {
            menu: true,
          },
        },
      },
    });

    // Agregasi data per gratuity
    const aggregatedData: Record<number, GratuityReportResponse> = {};

    for (const order of orders) {
      // Asumsikan hanya satu gratuity aktif per periode untuk simplifikasi
      const activeGratuity = gratuities.find((g) => g.isActive); // Ambil gratuity aktif pertama
      if (!activeGratuity) continue;

      const gratuityId = activeGratuity.id;
      if (!aggregatedData[gratuityId]) {
        aggregatedData[gratuityId] = {
          name: activeGratuity.name,
          rate: `${activeGratuity.value}%`,
          gratuityCollected: 0,
        };
      }

      aggregatedData[gratuityId].gratuityCollected += Number(order.gratuityAmount || 0);
    }

    // Konversi ke array dan urutkan berdasarkan gratuityCollected
    const result: GratuityReportResponse[] = Object.values(aggregatedData).sort(
      (a, b) => b.gratuityCollected - a.gratuityCollected
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    await prisma.$disconnect();
  }
}