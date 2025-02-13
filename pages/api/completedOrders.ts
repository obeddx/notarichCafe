import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Ambil semua CompletedOrder beserta OrderItem dan nama Menu
    const completedOrders = await prisma.completedOrder.findMany({
      include: {
        orderItems: {
          include: {
            menu: true, // Mengambil informasi menu
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
