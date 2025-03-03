import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { io } from "socket.io-client";

const prisma = new PrismaClient();
const SOCKET_URL = "http://localhost:3000";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: "Order ID is required" });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { reservasi: true },
    });

    if (!order) {
      return res.status(404).json({ error: "Pesanan tidak ditemukan" });
    }

    if (!order.reservasiId) {
      return res.status(400).json({ error: "Pesanan ini tidak memiliki kode booking" });
    }

    await prisma.$transaction(async (prisma) => {
      await prisma.order.delete({
        where: { id: orderId },
      });

      await prisma.reservasi.delete({
        where: { id: order.reservasiId },
      });

      await prisma.dataMeja.deleteMany({
        where: { nomorMeja: parseInt(order.tableNumber, 10) },
      });
    });

    const socket = io(SOCKET_URL, { path: "/api/socket" });
    socket.emit("reservationDeleted", { reservasiId: order.reservasiId, orderId });
    socket.emit("ordersUpdated", { deletedOrderId: orderId });
    socket.emit("tableStatusUpdated", { tableNumber: order.tableNumber });

    res.status(200).json({ message: "Pesanan dan reservasi berhasil direset" });
  } catch (error) {
    console.error("Error resetting booking order:", error);
    res.status(500).json({ error: "Gagal mereset pesanan" });
  } finally {
    await prisma.$disconnect();
  }
}