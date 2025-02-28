import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

interface OrderItem {
  menuId: number;
  quantity: number;
  note?: string;
  modifierIds?: number[];
  discountId?: number; // Tambahkan discountId per item
}

interface ReservationData {
  namaCustomer: string;
  nomorKontak: string;
  selectedDateTime: string;
  durasiJam: number;
  durasiMenit: number;
  meja?: string;
  kodeBooking: string;
}

interface OrderDetails {
  tableNumber: string;
  items: OrderItem[];
  total: number;
  customerName: string;
  paymentMethod?: string;
  isCashierOrder?: boolean;
  reservasiId?: number;
  discountId?: number;
  taxAmount?: number;
  gratuityAmount?: number;
  discountAmount?: number;
  finalTotal?: number;
  bookingCode?: string;
  reservationData?: ReservationData;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const orderDetails: OrderDetails = req.body;

    if (!orderDetails.tableNumber || !orderDetails.items.length) {
      return res.status(400).json({ message: "Invalid order data" });
    }

    console.log("Order Details Received:", orderDetails);

    const menuIds = orderDetails.items.map((item) => item.menuId);
    const menus = await prisma.menu.findMany({
      where: { id: { in: menuIds } },
      include: {
        discounts: { include: { discount: true } },
        modifiers: { include: { modifier: true } },
        ingredients: { include: { ingredient: true } },
      },
    });

    const tax = await prisma.tax.findFirst({ where: { isActive: true } });
    const gratuity = await prisma.gratuity.findFirst({ where: { isActive: true } });

    const newOrder = await prisma.$transaction(async (prisma) => {
      const orderItemsData = await Promise.all(
        orderDetails.items.map(async (item) => {
          const menu = menus.find((m) => m.id === item.menuId);
          if (!menu) throw new Error(`Menu with ID ${item.menuId} not found`);
          let price = menu.price;

          let modifierCost = 0;
          if (Array.isArray(item.modifierIds) && item.modifierIds.length > 0) {
            const modifiers = menu.modifiers.filter((m) => item.modifierIds!.includes(m.modifier.id));
            modifierCost = modifiers.reduce((sum, mod) => sum + (mod.modifier.price || 0), 0);
          }
          price += modifierCost;

          const subtotal = price * item.quantity;

          let discountAmount = 0;
          let discountIdUsed = item.discountId;
          if (item.discountId) {
            const discount = await prisma.discount.findUnique({
              where: { id: item.discountId },
            });
            if (discount && discount.isActive && discount.scope === "MENU") {
              discountAmount =
                discount.type === "PERCENTAGE"
                  ? (discount.value / 100) * menu.price * item.quantity
                  : discount.value * item.quantity;
            } else {
              console.warn(`Discount ID ${item.discountId} invalid or not MENU scope`);
              discountIdUsed = null;
            }
          }

          return {
            menuId: item.menuId,
            quantity: item.quantity,
            note: item.note || "",
            price,
            discountAmount,
            modifiers: {
              create: (item.modifierIds || []).map((modifierId) => ({
                modifierId,
              })),
            },
          };
        })
      );

      const totalBeforeDiscount = orderItemsData.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0
      );
      const totalMenuDiscountAmount = orderItemsData.reduce(
        (sum, item) => sum + item.discountAmount,
        0
      );
      const totalAfterMenuDiscount = totalBeforeDiscount - totalMenuDiscountAmount;

      const taxAmount = tax ? (tax.value / 100) * totalAfterMenuDiscount : 0;
      const gratuityAmount = gratuity ? (gratuity.value / 100) * totalAfterMenuDiscount : 0;

      let totalDiscountAmount = totalMenuDiscountAmount;
      let orderDiscountId = orderDetails.discountId;
      if (orderDetails.discountId) {
        const discount = await prisma.discount.findUnique({
          where: { id: orderDetails.discountId },
        });
        if (discount && discount.isActive && discount.scope === "TOTAL") {
          const additionalDiscount =
            discount.type === "PERCENTAGE"
              ? (discount.value / 100) * totalAfterMenuDiscount
              : discount.value;
          totalDiscountAmount += additionalDiscount;
          console.log(`Applied TOTAL discount: ${discount.name}, Amount: ${additionalDiscount}`);
        } else {
          console.warn(`Discount ID ${orderDetails.discountId} invalid or not TOTAL scope`);
          orderDiscountId = null;
        }
      }

      // Jika semua item memiliki discountId yang sama, gunakan itu sebagai order.discountId
      const itemDiscountIds = orderDetails.items
        .map((item) => item.discountId)
        .filter((id): id is number => id !== undefined);
      const uniqueDiscountIds = [...new Set(itemDiscountIds)];
      if (uniqueDiscountIds.length === 1 && !orderDiscountId) {
        orderDiscountId = uniqueDiscountIds[0];
        console.log(`Set order.discountId to ${orderDiscountId} based on item discounts`);
      }

      const baseTotal = totalAfterMenuDiscount - (totalDiscountAmount - totalMenuDiscountAmount);
      const finalTotal = baseTotal + taxAmount + gratuityAmount;

      const orderStatus = orderDetails.paymentMethod === "ewallet" ? "Sedang Diproses" : "pending";

      let reservasiId: number | null = null;
      if (orderDetails.bookingCode && orderDetails.reservationData) {
        const reservation = await prisma.reservasi.upsert({
          where: { kodeBooking: orderDetails.bookingCode },
          update: { status: "RESERVED" },
          create: {
            namaCustomer: orderDetails.reservationData.namaCustomer,
            nomorKontak: orderDetails.reservationData.nomorKontak,
            tanggalReservasi: new Date(orderDetails.reservationData.selectedDateTime),
            durasiPemesanan: orderDetails.reservationData.durasiJam * 60 + orderDetails.reservationData.durasiMenit,
            nomorMeja: orderDetails.tableNumber.split(" - ")[0],
            kodeBooking: orderDetails.bookingCode,
            status: "RESERVED",
          },
        });
        reservasiId = reservation.id;
      }

      const newOrder = await prisma.order.create({
        data: {
          customerName: orderDetails.customerName,
          tableNumber: orderDetails.tableNumber,
          total: totalBeforeDiscount,
          discountId: orderDiscountId || null,
          discountAmount: totalDiscountAmount,
          taxAmount,
          gratuityAmount,
          finalTotal,
          status: orderStatus,
          paymentMethod: orderDetails.paymentMethod,
          reservasiId,
          orderItems: {
            create: orderItemsData,
          },
        },
        include: {
          orderItems: {
            include: {
              menu: true,
              modifiers: { include: { modifier: true } },
            },
          },
          discount: true,
        },
      });

      return newOrder;
    });

    console.log("New Order Created:", {
      id: newOrder.id,
      totalBeforeDiscount: newOrder.total,
      totalDiscountAmount: newOrder.discountAmount,
      taxAmount: newOrder.taxAmount,
      gratuityAmount: newOrder.gratuityAmount,
      finalTotal: newOrder.finalTotal,
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
  } finally {
    await prisma.$disconnect();
  }
}