import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { orderId, paymentMethod, paymentStatus, paymentId, status } = req.body;

    if (!orderId || !paymentMethod || !paymentStatus) {
      return res.status(400).json({ message: "Order ID, payment method, dan status wajib diisi" });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentMethod,
        paymentStatus,
        paymentId,
        status: status || "pending", // Perbarui status order jika diberikan
      },
      include: {
        orderItems: {
          include: {
            menu: true,
            modifiers: { include: { modifier: true } },
          },
        },
        discount: true,
      },
    });

    // Emit event WebSocket
    if (res.socket && (res.socket as any).server) {
      const io = (res.socket as any).server.io;
      if (io) {
        io.emit("paymentStatusUpdated", updatedOrder);
        console.log("Status pembayaran dikirim ke kasir melalui WebSocket:", updatedOrder);
      } else {
        console.error("WebSocket server belum diinisialisasi");
      }
    }

    return res.status(200).json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("Error updating payment status:", error);
    return res.status(500).json({ message: "Gagal memperbarui status pembayaran", error: (error as Error).message });
  } finally {
    await prisma.$disconnect();
  }
}