import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  try {
    // Handle PUT request untuk update status
    if (req.method === "PUT") {
      const { status } = req.body;
      const updatedOrder = await prisma.order.update({
        where: { id: Number(id) },
        data: { status },
      });

      return res.status(200).json({ success: true, order: updatedOrder });
    }

    // Handle DELETE request untuk cancel order
    if (req.method === "DELETE") {
      // Hapus orderItems terlebih dahulu karena foreign key constraint
      await prisma.orderItem.deleteMany({
        where: { orderId: Number(id) },
      });

      // Hapus order
      await prisma.order.delete({
        where: { id: Number(id) },
      });

      return res.status(200).json({ message: "Pesanan berhasil dibatalkan" });
    }

    // Handle method lain yang tidak di-support
    res.status(405).json({ message: "Method not allowed" });
    
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = req.method === "PUT" 
      ? "Gagal update status pesanan" 
      : "Gagal membatalkan pesanan";
    res.status(500).json({ message: errorMessage });
  }
}