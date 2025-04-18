// pages/api/salesDetail.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getStartOfISOWeek(isoWeek: string): Date {
  const [yearStr, weekStr] = isoWeek.split("-W");
  const year = Number(yearStr);
  const week = Number(weekStr);
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = new Date(simple);
  if (dow === 0) {
    ISOweekStart.setDate(simple.getDate() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() - dow + 1);
  }
  return ISOweekStart;
}

interface SummaryRaw {
  totalOrders: bigint | number;
  totalSales: bigint | number;
}

interface SalesDetailResponse {
  summary: {
    totalSales: number;
    totalOrders: number;
  };
  orders: {
    orderId: number;
    createdAt: Date;
    total: number;
    items: {
      menuName: string;
      quantity: number;
      price: number;
    }[];
  }[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { date, period } = req.query;
  if (!date || !period) {
    return res.status(400).json({ error: "Missing date or period" });
  }

  let startDate: Date;
  let endDate: Date;

  try {
    if (period === "daily") {
      startDate = new Date(date as string);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else if (period === "weekly") {
      startDate = getStartOfISOWeek(date as string);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
    } else if (period === "monthly") {
      const [year, month] = (date as string).split("-");
      startDate = new Date(Number(year), Number(month) - 1, 1);
      endDate = new Date(Number(year), Number(month), 1);
    } else if (period === "yearly") {
      const year = Number(date);
      startDate = new Date(year, 0, 1);
      endDate = new Date(year + 1, 0, 1);
    } else {
      startDate = new Date(date as string);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    }

    const summaryRaw: SummaryRaw[] = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as totalOrders,
        SUM(finalTotal) as totalSales
      FROM CompletedOrder
      WHERE createdAt >= ${startDate} AND createdAt < ${endDate}
    `;
    const summary: SalesDetailResponse["summary"] =
      summaryRaw && summaryRaw.length > 0
        ? {
            totalSales: Number(summaryRaw[0].totalSales) || 0,
            totalOrders: Number(summaryRaw[0].totalOrders) || 0,
          }
        : { totalSales: 0, totalOrders: 0 };

    const orders = await prisma.completedOrder.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        id: true,
        createdAt: true,
        finalTotal: true,
        orderItems: {
          select: {
            quantity: true,
            menu: {
              select: {
                name: true,
                price: true,
                hargaBakul: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedOrders: SalesDetailResponse["orders"] = orders.map((o) => ({
      orderId: o.id,
      createdAt: o.createdAt,
      total: o.finalTotal,
      items: o.orderItems.map((oi) => ({
        menuName: oi.menu.name,
        quantity: oi.quantity,
        price: oi.menu.price,
      })),
    }));

    const response: SalesDetailResponse = {
      summary,
      orders: formattedOrders,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching sales detail:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}