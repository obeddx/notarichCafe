import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import type { Server as SocketServer } from "socket.io";

const prisma = new PrismaClient();

interface OrderItem {
  menuId: number;
  menuName: string;
  quantity: number;
  note?: string;
}

interface OrderDetails {
  tableNumber: string;
  items: OrderItem[];
  total: number;
  customerName: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { customerName } = req.body;

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const orderDetails: OrderDetails = req.body;

    // Validasi data yang diterima dari frontend
    if (!orderDetails.tableNumber || !orderDetails.items.length || !orderDetails.total) {
      return res.status(400).json({ message: "Invalid order data" });
    }

    // Simpan Order ke database
    const newOrder = await prisma.order.create({
      data: {
        customerName,
        tableNumber: orderDetails.tableNumber,
        total: orderDetails.total,
        status: "pending",
        orderItems: {
          create: orderDetails.items.map((item) => ({
            menuId: item.menuId,
            menuName: item.menuName,
            quantity: item.quantity,
            note: item.note || "", // Jika tidak ada catatan, simpan sebagai string kosong
          })),
        },
      },
      include: {
        orderItems: {
          include: {
            menu: true, // Pastikan gambar menu ikut dikembalikan
          },
        },
      },
    });

    // Mengambil instance WebSocket
    const io = (res.socket as any)?.server?.io as SocketServer;
    if (io) {
      // Kirim event 'new-order' ke semua klien terhubung
      io.emit("new-order", newOrder);
    }

    // Kembalikan order beserta item beserta gambar menu
    res.status(200).json({
      success: true,
      message: "Order placed successfully",
      order: newOrder,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ message: "Failed to place order", error: error.message });
  }
}
