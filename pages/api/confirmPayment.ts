import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    try {
      const { orderId, paymentId } = req.body;

      // Validasi input
      if (!orderId || isNaN(Number(orderId))) {
        return res.status(400).json({ message: "Order ID tidak valid" });
      }

      // Update status pesanan
      const updatedOrder = await prisma.order.update({
        where: { id: Number(orderId) },
        data: {
          status: "Sedang Diproses",
          paymentId: paymentId || "TUNAI",
        },
      });

      return res.status(200).json(updatedOrder);
    } catch (error: any) {
      return res.status(500).json({
        message: "Gagal mengonfirmasi pembayaran",
        error: error.message,
      });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}