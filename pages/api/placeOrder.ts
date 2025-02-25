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
  discountId?: number;
  taxAmount?: number;
  gratuityAmount?: number;
  discountAmount?: number;
  finalTotal?: number;
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

    console.log("Order Details Received:", orderDetails);

    const menuIds = orderDetails.items.map((item) => item.menuId);
    const menus = await prisma.menu.findMany({
      where: { id: { in: menuIds } },
      include: { discounts: { include: { discount: true } } },
    });

    const tax = await prisma.tax.findFirst({ where: { isActive: true } });
    const gratuity = await prisma.gratuity.findFirst({ where: { isActive: true } });

    let totalBeforeDiscount = 0;
    const orderItemsData = orderDetails.items.map((item) => {
      const menu = menus.find((m) => m.id === item.menuId);
      if (!menu) throw new Error(`Menu with ID ${item.menuId} not found`);
      const price = menu.price;
      const subtotal = price * item.quantity;
      totalBeforeDiscount += subtotal;

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

    // Hitung total setelah diskon scope MENU
    let totalMenuDiscountAmount = orderItemsData.reduce((sum, item) => sum + item.discountAmount, 0);
    const totalAfterMenuDiscount = totalBeforeDiscount - totalMenuDiscountAmount;

    // Hitung pajak dan gratuity berdasarkan total setelah diskon MENU
    const taxAmount = tax ? (tax.value / 100) * totalAfterMenuDiscount : 0;
    const gratuityAmount = gratuity ? (gratuity.value / 100) * totalAfterMenuDiscount : 0;
    const initialFinalTotal = totalAfterMenuDiscount + taxAmount + gratuityAmount;

    // Hitung diskon scope TOTAL berdasarkan initialFinalTotal
    let totalDiscountAmount = totalMenuDiscountAmount;
    if (orderDetails.discountId) {
      const discount = await prisma.discount.findUnique({
        where: { id: orderDetails.discountId },
      });
      if (discount && discount.isActive && discount.scope === "TOTAL") {
        const additionalDiscount =
          discount.type === "PERCENTAGE"
            ? (discount.value / 100) * initialFinalTotal
            : discount.value;
        totalDiscountAmount += additionalDiscount;
        console.log(`Applied TOTAL discount: ${discount.name}, Amount: ${additionalDiscount}`);
      } else {
        console.warn(`Discount ID ${orderDetails.discountId} invalid or not TOTAL scope`);
      }
    }

    // Batasi totalDiscountAmount agar tidak melebihi initialFinalTotal
    totalDiscountAmount = Math.min(totalDiscountAmount, initialFinalTotal);
    const finalTotal = initialFinalTotal - totalDiscountAmount;

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
        status: "pending", // Selalu set status ke pending saat order dibuat
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