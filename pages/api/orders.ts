import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const orders = await prisma.order.findMany({
      include: {
        orderItems: {
          include: {
            menu: true,
          },
        },
        discount: true,
      },
    });
    res.status(200).json({ orders });
  } else if (req.method === "PUT") {
    const { orderId, paymentMethod, paymentId, discountId, cashGiven, change } = req.body;
  
    if (!orderId || !paymentMethod) {
      return res.status(400).json({ message: "Order ID dan metode pembayaran wajib diisi" });
    }
  
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { orderItems: { include: { menu: true } } },
      });
  
      if (!order) {
        return res.status(404).json({ message: "Pesanan tidak ditemukan" });
      }
  
      // Hitung total diskon scope MENU dari orderItems
      const menuDiscountAmount = order.orderItems.reduce((sum, item) => sum + item.discountAmount, 0);
      const totalAfterMenuDiscount = order.total - menuDiscountAmount;
  
      // Gunakan pajak dan gratuity awal dari order
      const initialFinalTotal = totalAfterMenuDiscount + order.taxAmount + order.gratuityAmount;
  
      // Hitung total diskon termasuk scope TOTAL
      let totalDiscountAmount = menuDiscountAmount;
      if (discountId) {
        const discount = await prisma.discount.findUnique({
          where: { id: discountId },
        });
        if (discount && discount.isActive && discount.scope === "TOTAL") {
          const additionalDiscount =
            discount.type === "PERCENTAGE"
              ? (discount.value / 100) * initialFinalTotal
              : discount.value;
          totalDiscountAmount += additionalDiscount;
        }
      }
  
      // Batasi totalDiscountAmount agar tidak melebihi initialFinalTotal
      totalDiscountAmount = Math.min(totalDiscountAmount, initialFinalTotal);
      const finalTotal = initialFinalTotal - totalDiscountAmount;
  
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentMethod,
          paymentId: paymentMethod !== "tunai" ? paymentId : null,
          discountId: discountId || null,
          discountAmount: totalDiscountAmount,
          taxAmount: order.taxAmount, // Pertahankan nilai awal
          gratuityAmount: order.gratuityAmount, // Pertahankan nilai awal
          finalTotal: finalTotal >= 0 ? finalTotal : 0,
          cashGiven: cashGiven ? Number(cashGiven) : null, // Simpan cashGiven
          change: change ? Number(change) : null,          // Simpan change
          status: "Sedang Diproses",
        },
        include: {
          orderItems: {
            include: {
              menu: true,
            },
          },
          discount: true,
        },
      });
  
      console.log("Order Updated:", updatedOrder);
      res.status(200).json({ success: true, order: updatedOrder });
    } catch (error) {
      console.error("Gagal mengonfirmasi pembayaran:", error);
      res.status(500).json({ message: "Gagal mengonfirmasi pembayaran", error: (error as Error).message });
    }
  }}