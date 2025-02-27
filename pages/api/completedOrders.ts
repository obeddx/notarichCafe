import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { startDate, endDate, tableNumber, paymentMethod, minTotal, maxTotal } = req.query;

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

    if (tableNumber && typeof tableNumber === "string") {
      whereConditions.tableNumber = tableNumber;
    }

    if (paymentMethod && typeof paymentMethod === "string") {
      whereConditions.paymentMethod = paymentMethod;
    }

    if (minTotal || maxTotal) {
      whereConditions.total = {};
      if (minTotal) whereConditions.total.gte = parseFloat(minTotal as string);
      if (maxTotal) whereConditions.total.lte = parseFloat(maxTotal as string);
    }

    const completedOrders = await prisma.completedOrder.findMany({
      where: whereConditions,
      include: {
        orderItems: {
          include: {
            menu: true,
            modifiers: { include: { modifier: true } }, // Sertakan modifier
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const transformedOrders = completedOrders.map((order) => ({
      id: order.id,
      tableNumber: order.tableNumber,
      total: order.total,
      discountAmount: order.discountAmount, // Tambahkan ini
      taxAmount: order.taxAmount,          // Tambahkan ini
      gratuityAmount: order.gratuityAmount, // Tambahkan ini
      paymentMethod: order.paymentMethod,
      paymentId: order.paymentId,
      createdAt: order.createdAt.toISOString(),
      orderItems: order.orderItems.map((item) => ({
        id: item.id,
        menuName: item.menu.name,
        quantity: item.quantity,
        note: item.note,
        modifiers: item.modifiers.map((mod) => ({
          id: mod.id,
          modifierId: mod.modifierId,
          name: mod.modifier.name,
          price: mod.modifier.price,
        })),
      })),
    }));

    return res.status(200).json({ orders: transformedOrders });
  } catch (error) {
    console.error("❌ Error fetching completed orders:", error);
    return res.status(500).json({
      message: "Gagal mengambil data riwayat pesanan",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    await prisma.$disconnect();
  }
}