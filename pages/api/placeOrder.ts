import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import type { Server as SocketServer } from "socket.io";

const prisma = new PrismaClient();

interface OrderDetails {
  tableNumber: string;
  items: any[]; // disesuaikan dengan struktur data yang dikirim
  total: number;
  customerName: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const orderDetails: OrderDetails = req.body;
    console.log("orderDetails:", orderDetails);

    // Validasi data order
    if (
      !orderDetails.tableNumber ||
      !orderDetails.items ||
      orderDetails.items.length === 0 ||
      !orderDetails.total
    ) {
      return res.status(400).json({ message: "Invalid order data" });
    }

    // Mapping data cart ke OrderItem
    // Jika terdapat properti menuId maka dianggap item menu,
    // sedangkan jika terdapat bundleId maka dianggap item bundle.
    // Perhatian: pastikan untuk item bundle, data juga menyertakan array bundleMenus
    const orderItemsData = orderDetails.items.flatMap((cartItem: any) => {
      // Jika item adalah menu biasa
      if (cartItem.menuId) {
        return [
          {
            menuId: cartItem.menuId,
            quantity: cartItem.quantity,
            note: cartItem.note || "",
          },
        ];
      }
      // Jika item adalah bundle
      else if (cartItem.bundleId) {
        if (cartItem.bundleMenus && Array.isArray(cartItem.bundleMenus)) {
          // Setiap menu di dalam bundle dikalikan dengan kuantitas bundle,
          // dan sertakan juga bundleId
          return cartItem.bundleMenus.map((bm: any) => ({
            menuId: bm.menuId,
            quantity: bm.quantity * cartItem.quantity,
            note: cartItem.note || "",
            bundleId: cartItem.bundleId,
          }));
        } else {
          console.warn(
            "Bundle item dengan bundleId",
            cartItem.bundleId,
            "tidak memiliki properti bundleMenus"
          );
          return [];
        }
      }
      return [];
    });
    

    console.log("orderItemsData:", orderItemsData);

    if (orderItemsData.length === 0) {
      return res.status(400).json({ message: "No valid order items found" });
    }

    // Simpan order ke database
    const newOrder = await prisma.order.create({
      data: {
        customerName: orderDetails.customerName,
        tableNumber: orderDetails.tableNumber,
        total: orderDetails.total,
        status: "pending",
        orderItems: {
          create: orderItemsData,
        },
      },
      include: {
        orderItems: {
          include: {
            menu: true, // sertakan data menu jika diperlukan
          },
        },
      },
    });

    // Kirim notifikasi melalui WebSocket
    const io = (res.socket as any)?.server?.io as SocketServer;
    if (io) {
      io.emit("new-order", newOrder);
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
