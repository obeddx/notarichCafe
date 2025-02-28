import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface AggregatedDiscount {
  name: string;
  discount: string;
  count: number;
  grossDiscount: number;
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

    console.log("Fetching discount data for period:", { startDate, endDate });

    const orders = await prisma.completedOrder.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
        OR: [
          { discountId: { not: null } },
          { discountAmount: { gt: 0 } },
        ],
      },
      include: {
        discount: true,
        orderItems: {
          include: {
            menu: true,
          },
        },
      },
    });

    console.log("Orders found:", orders.length);

    const aggregatedData: Record<string, AggregatedDiscount> = {};

    for (const order of orders) {
      const discountId = order.discountId;
      const discountKey = discountId ? discountId.toString() : "manual";

      // Ambil data diskon dari tabel Discount jika discountId ada
      let discountData = null;
      if (discountId) {
        discountData = await prisma.discount.findUnique({
          where: { id: discountId },
        });
        if (!discountData) {
          console.warn(`No discount found for discountId: ${discountId} in order ${order.id}`);
        }
      }

      // Debugging detail pesanan
      console.log("Order Details:", {
        id: order.id,
        discountId: order.discountId,
        discountAmount: order.discountAmount,
        discountData: discountData ? { name: discountData.name, value: discountData.value, type: discountData.type } : null,
      });

      if (!aggregatedData[discountKey]) {
        aggregatedData[discountKey] = {
          name: discountData ? discountData.name : "Manual Discount",
          discount: discountData
            ? discountData.type === "PERCENTAGE"
              ? `${discountData.value}%`
              : `${discountData.value}`
            : `${order.discountAmount || 0}`,
          count: 0,
          grossDiscount: 0,
        };
      }

      aggregatedData[discountKey].count += 1;
      const grossDiscount = Number(order.discountAmount || 0);
      aggregatedData[discountKey].grossDiscount += grossDiscount;

      console.log(`Aggregated: Key: ${discountKey}, Name: ${aggregatedData[discountKey].name}, Discount: ${aggregatedData[discountKey].discount}, Gross: ${grossDiscount}`);
    }

    const result = Object.values(aggregatedData).sort((a, b) => b.grossDiscount - a.grossDiscount);

    console.log("Aggregated Discount Data:", result);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in discount-report API:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    await prisma.$disconnect();
  }
}