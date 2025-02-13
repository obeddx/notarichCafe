import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { orderId } = req.body;

    // Ambil data order yang akan dipindahkan
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });

    if (!order) {
      return res.status(404).json({ message: "Order tidak ditemukan" });
    }

    // Pindahkan data order ke CompletedOrder tanpa menghapus order asli
    await prisma.completedOrder.create({
      data: {
        originalOrderId: order.id, // Menyimpan ID order asli
        tableNumber: order.tableNumber,
        total: order.total,
        paymentMethod: order.paymentMethod,
        paymentId: order.paymentId,
        createdAt: order.createdAt,
        orderItems: {
          create: order.orderItems.map((item) => ({
            menuId: item.menuId,
            quantity: item.quantity,
            note: item.note,
          })),
        },
      },
    });

    // **Tambahan: Update status order menjadi "Selesai"**
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "Selesai" },
    });

    return res.status(200).json({ message: "Pesanan selesai, dicatat ke riwayat, dan status diperbarui." });
  } catch (error) {
    console.error("❌ Error menyelesaikan pesanan:", error);
    return res.status(500).json({ message: "Gagal menyelesaikan pesanan." });
  }
}
