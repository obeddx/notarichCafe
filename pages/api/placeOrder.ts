import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

interface OrderItem {
  menuId: number;
  quantity: number;
  note?: string;
}

interface OrderDetails {
  tableNumber: string;
  items: OrderItem[];
  total: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
        tableNumber: orderDetails.tableNumber,
        total: orderDetails.total,
        status: "pending",
        orderItems: {
          create: orderDetails.items.map((item) => ({
            menuId: item.menuId,
            quantity: item.quantity,
            note: item.note || "", // Jika tidak ada catatan, simpan sebagai string kosong
          })),
        },
      },
      include: {
        orderItems: true, // Pastikan orderItems dikembalikan dalam respons
      },
    });

    res.status(200).json({
      success: true,
      message: "Order placed successfully",
      order: newOrder,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ message: "Failed to place order" });
  }
}
