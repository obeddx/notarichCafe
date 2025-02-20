import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { startDate, endDate } = req.query;

    let startDateFilter: Date | null = null;
    let endDateFilter: Date | null = null;

    if (startDate && typeof startDate === "string") {
      startDateFilter = new Date(`${startDate}T00:00:00.000Z`);
    }

    if (endDate && typeof endDate === "string") {
      endDateFilter = new Date(`${endDate}T23:59:59.999Z`);
    }

    const whereConditions: any = {};

    if (startDateFilter || endDateFilter) {
      whereConditions.createdAt = {};
      if (startDateFilter) whereConditions.createdAt.gte = startDateFilter;
      if (endDateFilter) whereConditions.createdAt.lte = endDateFilter;
    }

    const completedOrders = await prisma.completedOrder.findMany({
      where: whereConditions,
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

    const transformedOrders = completedOrders.map((order) => ({
      ...order,
      createdAt: order.createdAt.toISOString(),
      orderItems: order.orderItems.map((item) => ({
        ...item,
        menuName: item.menu.name,
      })),
    }));

    return res.status(200).json({ orders: transformedOrders });
  } catch (error) {
    console.error("❌ Error fetching completed orders by date:", error);
    return res.status(500).json({
      message: "Gagal mengambil data riwayat pesanan berdasarkan jangka waktu.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    await prisma.$disconnect();
  }
}
