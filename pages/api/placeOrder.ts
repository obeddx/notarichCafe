import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

interface OrderItem {
  menuId: number;
  quantity: number;
  note?: string;
  modifierIds?: number[];
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
      include: {
        discounts: { include: { discount: true } },
        modifiers: { include: { modifier: true } },
        ingredients: { include: { ingredient: true } },
      },
    });

    const tax = await prisma.tax.findFirst({ where: { isActive: true } });
    const gratuity = await prisma.gratuity.findFirst({ where: { isActive: true } });

    // Deklarasi variabel di luar transaksi
    let totalBeforeDiscount = 0;
    let totalDiscountAmount = 0;
    let taxAmount = 0;
    let gratuityAmount = 0;
    let finalTotal = 0;

    const newOrder = await prisma.$transaction(async (prisma) => {
      const orderItemsData = await Promise.all(
        orderDetails.items.map(async (item) => {
          const menu = menus.find((m) => m.id === item.menuId);
          if (!menu) throw new Error(`Menu with ID ${item.menuId} not found`);
          let price = menu.price;

          let modifierCost = 0;
          if (item.modifierIds && item.modifierIds.length > 0) {
            const modifiers = await prisma.modifier.findMany({
              where: { id: { in: item.modifierIds } },
              include: { ingredients: { include: { ingredient: true } } },
            });
            modifiers.forEach((modifier) => {
              modifierCost += modifier.price || 0;
            });
          }
          price += modifierCost;

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

          // Kurangi stok dan tambah used untuk ingredients dari menu
          for (const menuIng of menu.ingredients) {
            const ingredient = menuIng.ingredient;
            const usedAmount = menuIng.amount * item.quantity;
            await prisma.ingredient.update({
              where: { id: ingredient.id },
              data: {
                stock: ingredient.stock - usedAmount,
                used: ingredient.used + usedAmount,
              },
            });
          }

          // Kurangi stok dan tambah used untuk ingredients dari modifier
          if (item.modifierIds && item.modifierIds.length > 0) {
            const modifierIngredients = await prisma.modifierIngredient.findMany({
              where: { modifierId: { in: item.modifierIds } },
              include: { ingredient: true },
            });
            for (const modIng of modifierIngredients) {
              const ingredient = modIng.ingredient;
              const usedAmount = modIng.amount * item.quantity;
              await prisma.ingredient.update({
                where: { id: ingredient.id },
                data: {
                  stock: ingredient.stock - usedAmount,
                  used: ingredient.used + usedAmount,
                },
              });
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

      const totalMenuDiscountAmount = orderItemsData.reduce((sum, item) => sum + item.discountAmount, 0);
      const totalAfterMenuDiscount = totalBeforeDiscount - totalMenuDiscountAmount;

      taxAmount = tax ? (tax.value / 100) * totalAfterMenuDiscount : 0;
      gratuityAmount = gratuity ? (gratuity.value / 100) * totalAfterMenuDiscount : 0;
      const initialFinalTotal = totalAfterMenuDiscount + taxAmount + gratuityAmount;

      totalDiscountAmount = totalMenuDiscountAmount;
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

      totalDiscountAmount = Math.min(totalDiscountAmount, initialFinalTotal);
      finalTotal = initialFinalTotal - totalDiscountAmount;

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
          status: "pending",
          reservasiId: orderDetails.reservasiId || null,
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
        },
      });

      return newOrder;
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
  } finally {
    await prisma.$disconnect();
  }
}