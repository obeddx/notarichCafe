import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const {
      startDate,
      endDate,
      tableNumber,
      paymentMethod,
      minTotal,
      maxTotal,
    } = req.query;

    // 1. Handle date filtering dengan UTC
    let startDateFilter: Date | null = null;
    let endDateFilter: Date | null = null;
    
    if (startDate && typeof startDate === "string") {
      // Set ke awal hari dalam UTC (00:00:00)
      startDateFilter = new Date(`${startDate}T00:00:00.000Z`);
    }
    
    if (endDate && typeof endDate === "string") {
      // Set ke akhir hari dalam UTC (23:59:59.999)
      endDateFilter = new Date(`${endDate}T23:59:59.999Z`);
    }

    // 2. Build filter conditions
    const whereConditions: any = {};
    
    // Date filter
    if (startDateFilter || endDateFilter) {
      whereConditions.createdAt = {};
      if (startDateFilter) whereConditions.createdAt.gte = startDateFilter;
      if (endDateFilter) whereConditions.createdAt.lte = endDateFilter;
    }
    
    // Table number filter
    if (tableNumber && typeof tableNumber === "string") {
      whereConditions.tableNumber = tableNumber;
    }
    
    // Payment method filter
    if (paymentMethod && typeof paymentMethod === "string") {
      whereConditions.paymentMethod = paymentMethod;
    }
    
    // Total price range filter
    if (minTotal || maxTotal) {
      whereConditions.total = {};
      if (minTotal) whereConditions.total.gte = parseFloat(minTotal as string);
      if (maxTotal) whereConditions.total.lte = parseFloat(maxTotal as string);
    }

    // 3. Query database
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

    // 4. Transform data untuk response
    const transformedOrders = completedOrders.map(order => ({
      ...order,
      createdAt: order.createdAt.toISOString(),
      orderItems: order.orderItems.map(item => ({
        ...item,
        menuName: item.menu.name,
      })),
    }));

    return res.status(200).json({ orders: transformedOrders });
    
  } catch (error) {
    console.error("❌ Error fetching completed orders:", error);
    return res.status(500).json({ 
      message: "Gagal mengambil data riwayat pesanan",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  } finally {
    await prisma.$disconnect();
  }
}