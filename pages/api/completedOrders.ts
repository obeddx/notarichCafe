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

    // Konversi startDate dan endDate ke tipe Date
    const startDateFilter = startDate ? new Date(startDate as string) : null;
    const endDateFilter = endDate ? new Date(endDate as string) : null;

    // Filter berdasarkan tanggal
    const dateFilter = {
      ...(startDateFilter && { createdAt: { gte: startDateFilter } }),
      ...(endDateFilter && { createdAt: { lte: endDateFilter } }),
    };

    // Filter berdasarkan nomor meja
    const tableFilter = tableNumber ? { tableNumber: tableNumber as string } : {};

    // Filter berdasarkan metode pembayaran
    const paymentFilter = paymentMethod
      ? { paymentMethod: paymentMethod as string }
      : {};

    // Filter berdasarkan total harga
    const totalFilter = {
      ...(minTotal && { total: { gte: parseFloat(minTotal as string) } }),
      ...(maxTotal && { total: { lte: parseFloat(maxTotal as string) } }),
    };

    // Ambil semua CompletedOrder dengan filter
    const completedOrders = await prisma.completedOrder.findMany({
      where: {
        ...dateFilter,
        ...tableFilter,
        ...paymentFilter,
        ...totalFilter,
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

    return res.status(200).json({ orders: completedOrders });
  } catch (error) {
    console.error("❌ Error fetching completed orders:", error);
    return res.status(500).json({ message: "Gagal mengambil data riwayat pesanan." });
  }
}