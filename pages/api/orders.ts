import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const orders = await prisma.order.findMany({
        include: { 
          orderItems: {
            include: {
              menu: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
      });
      res.status(200).json({ success: true, orders });
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  } else if (req.method === "PUT") {
    const { orderId, paymentMethod, paymentId } = req.body;

    if (!orderId || !paymentMethod) {
      return res.status(400).json({ message: "Order ID dan metode pembayaran wajib diisi" });
    }

    try {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentMethod,
          paymentId: paymentMethod !== "tunai" ? paymentId : null,
          status: "Sedang Diproses",
        },
      });

      res.status(200).json({ success: true, order: updatedOrder });
    } catch (error) {
      console.error("Gagal mengonfirmasi pembayaran:", error);
      res.status(500).json({ message: "Gagal mengonfirmasi pembayaran" });
    }
  } else {
    res.status(405).json({ message: "Method tidak diizinkan" });
  }
}