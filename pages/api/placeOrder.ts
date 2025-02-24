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
  customerName: string;
  isCashierOrder?: boolean;
  reservasiId?: number;
  discountId?: number; // ID discount untuk scope TOTAL (opsional, hanya dari kasir)
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

    // Logging untuk debugging
    console.log("Order Details Received:", orderDetails);

    // Ambil data menu beserta discount
    const menuIds = orderDetails.items.map((item) => item.menuId);
    const menus = await prisma.menu.findMany({
      where: { id: { in: menuIds } },
      include: { discounts: { include: { discount: true } } },
    });

    // Ambil tax dan gratuity aktif
    const tax = await prisma.tax.findFirst({ where: { isActive: true } });
    const gratuity = await prisma.gratuity.findFirst({ where: { isActive: true } });

    // Hitung total sebelum discount
    let totalBeforeDiscount = 0;
    const orderItemsData = orderDetails.items.map((item) => {
      const menu = menus.find((m) => m.id === item.menuId);
      if (!menu) throw new Error(`Menu with ID ${item.menuId} not found`);
      const price = menu.price;
      const subtotal = price * item.quantity;
      totalBeforeDiscount += subtotal;

      // Hitung discount scope MENU
      let discountAmount = 0;
      const menuDiscount = menu.discounts.find((d) => d.discount.isActive);
      if (menuDiscount) {
        const discount = menuDiscount.discount;
        discountAmount =
          discount.type === "PERCENTAGE"
            ? (discount.value / 100) * price * item.quantity
            : discount.value * item.quantity;
      }

      return {
        menuId: item.menuId,
        quantity: item.quantity,
        note: item.note || "",
        price,
        discountAmount,
      };
    });

    // Hitung discount scope TOTAL (jika ada, hanya dari kasir)
    let totalDiscountAmount = orderItemsData.reduce((sum, item) => sum + item.discountAmount, 0);
    if (orderDetails.discountId) {
      const discount = await prisma.discount.findUnique({
        where: { id: orderDetails.discountId },
      });
      if (discount && discount.isActive && discount.scope === "TOTAL") {
        totalDiscountAmount +=
          discount.type === "PERCENTAGE"
            ? (discount.value / 100) * totalBeforeDiscount
            : discount.value;
        console.log(`Applied TOTAL discount: ${discount.name}, Amount: ${totalDiscountAmount - orderItemsData.reduce((sum, item) => sum + item.discountAmount, 0)}`);
      } else {
        console.warn(`Discount ID ${orderDetails.discountId} invalid or not TOTAL scope`);
      }
    }

    // Hitung tax dan gratuity
    const totalAfterDiscount = totalBeforeDiscount - totalDiscountAmount;
    const taxAmount = tax ? (tax.value / 100) * totalAfterDiscount : 0;
    const gratuityAmount = gratuity ? (gratuity.value / 100) * totalAfterDiscount : 0;
    const finalTotal = totalAfterDiscount + taxAmount + gratuityAmount;

    // Simpan Order ke database
    const newOrder = await prisma.order.create({
      data: {
        customerName: orderDetails.customerName,
        tableNumber: orderDetails.tableNumber,
        total: totalBeforeDiscount,
        discountId: orderDetails.discountId || null,
        discountAmount: totalDiscountAmount,
        taxAmount,
        gratuityAmount,
        finalTotal,
        status: orderDetails.isCashierOrder ? "Sedang Diproses" : "pending",
        reservasiId: orderDetails.reservasiId || null,
        orderItems: {
          create: orderItemsData,
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

    console.log("New Order Created:", {
      id: newOrder.id,
      totalBeforeDiscount,
      totalDiscountAmount,
      taxAmount,
      gratuityAmount,
      finalTotal,
      discountId: newOrder.discountId,
    });

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