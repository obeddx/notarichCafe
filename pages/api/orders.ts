import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // Kode GET tetap sama
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
    const { orderId, paymentMethod, paymentId, discountId } = req.body;

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

      // Hitung ulang discountAmount
      let totalDiscountAmount = order.orderItems.reduce((sum, item) => sum + item.discountAmount, 0);
      if (discountId) {
        const discount = await prisma.discount.findUnique({
          where: { id: discountId },
        });
        if (discount && discount.isActive && discount.scope === "TOTAL") {
          const additionalDiscount =
            discount.type === "PERCENTAGE" ? (discount.value / 100) * order.total : discount.value;
          totalDiscountAmount += additionalDiscount;
        }
      }

      // Batasi diskon agar tidak melebihi total (100%)
      totalDiscountAmount = Math.min(totalDiscountAmount, order.total);
      const totalAfterDiscount = order.total - totalDiscountAmount;

      // Hitung ulang tax dan gratuity berdasarkan totalAfterDiscount
      const tax = await prisma.tax.findFirst({ where: { isActive: true } });
      const gratuity = await prisma.gratuity.findFirst({ where: { isActive: true } });
      const taxAmount = tax ? (tax.value / 100) * totalAfterDiscount : 0;
      const gratuityAmount = gratuity ? (gratuity.value / 100) * totalAfterDiscount : 0;
      const finalTotal = totalAfterDiscount + taxAmount + gratuityAmount;

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentMethod,
          paymentId: paymentMethod !== "tunai" ? paymentId : null,
          discountId: discountId || null,
          discountAmount: totalDiscountAmount,
          taxAmount,
          gratuityAmount,
          finalTotal,
          status: "Sedang Diproses",
        },
        include: {
          orderItems: {
            include: {
              menu: true,
            },
          },
          discount: true, // Sertakan data diskon untuk frontend
        },
      });

      console.log("Order Updated:", updatedOrder);
      res.status(200).json({ success: true, order: updatedOrder });
    } catch (error) {
      console.error("Gagal mengonfirmasi pembayaran:", error);
      res.status(500).json({ message: "Gagal mengonfirmasi pembayaran", error: (error as Error).message });
    }
  } else {
    res.status(405).json({ message: "Method tidak diizinkan" });
  }
}