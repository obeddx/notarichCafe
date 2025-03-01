import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    try {
      // Hapus pesanan berdasarkan orderId, hanya jika memiliki kode booking
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

      await prisma.order.delete({
        where: { id: orderId },
      });

      res.status(200).json({ message: `Pesanan dengan kode booking berhasil direset` });
    } catch (error) {
      console.error("Error resetting booking order:", error);
      res.status(500).json({ error: "Gagal mereset pesanan" });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}