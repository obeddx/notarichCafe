import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

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
  isCashierOrder?: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const orderDetails: OrderDetails = req.body;

    if (!orderDetails.tableNumber || !orderDetails.items.length || !orderDetails.total) {
      return res.status(400).json({ message: "Invalid order data" });
    }

    // Simpan Order ke database
    const newOrder = await prisma.order.create({
      data: {
        customerName: orderDetails.customerName,
        tableNumber: orderDetails.tableNumber,
        total: orderDetails.total,
        status: orderDetails.isCashierOrder ? "Sedang Diproses" : "pending",
        orderItems: {
          create: orderDetails.items.map((item) => ({
            menuId: item.menuId,
            menuName: item.menuName,
            quantity: item.quantity,
            note: item.note || "",
          })),
        },
      },
      include: {
        orderItems: {
          include: {
            menu: true,
          },
        },
      },
    });

    // **Pastikan res.socket tidak null sebelum mengaksesnya**
    if (res.socket && (res.socket as any).server) {
      const io = (res.socket as any).server.io;
      if (io) {
        io.emit("ordersUpdated", newOrder);
        console.log("Pesanan baru dikirim ke kasir melalui WebSocket");
      } else {
        console.error("WebSocket server belum diinisialisasi");
      }
    }

    res.status(200).json({
      success: true,
      message: "Order placed successfully",
      order: newOrder,
    });
  } catch (error: any) {
    console.error("Error placing order:", error);
    res.status(500).json({ message: "Failed to place order", error: error.message });
  }
}
