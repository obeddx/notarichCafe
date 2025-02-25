// pages/api/sales-details.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getStartAndEndDates(period: string, dateString: string): { startDate: Date; endDate: Date } {
  const date = new Date(dateString);
  let startDate: Date, endDate: Date;

  switch (period) {
    case "daily":
    case "daily-prev":
      startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);
      break;
    case "weekly":
    case "weekly-prev":
      const day = date.getDay();
      const diff = date.getDate() - (day === 0 ? 6 : day - 1);
      startDate = new Date(date.getFullYear(), date.getMonth(), diff);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
      break;
    case "monthly":
    case "monthly-prev":
      startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      endDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      break;
    case "yearly":
    case "yearly-prev":
      startDate = new Date(date.getFullYear(), 0, 1);
      endDate = new Date(date.getFullYear() + 1, 0, 1);
      break;
    default:
      throw new Error("Invalid period");
  }
  return { startDate, endDate };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { metric, period = "daily", date = new Date().toISOString() } = req.query;
    const { startDate, endDate } = getStartAndEndDates(period as string, date as string);

    const orders = await prisma.completedOrder.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        orderItems: {
          include: {
            menu: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    switch (metric) {
      case "sales":
        const totalSales = orders.reduce((acc, order) => acc + Number(order.finalTotal), 0);
        const summarySales = {
          explanation: "Total penjualan dihitung dengan menjumlahkan nilai finalTotal dari setiap order yang berhasil diselesaikan, termasuk efek diskon, pajak, dan gratuity.",
          "Total Penjualan": totalSales,
          "Jumlah Pesanan": orders.length,
        };
        return res.status(200).json({ summary: summarySales, details: orders });

      case "transactions":
        const detailsTransactions = orders.map(order => ({
          id: order.id,
          createdAt: order.createdAt,
          total: order.finalTotal,
          itemCount: order.orderItems.reduce((acc, item) => acc + item.quantity, 0),
          menus: order.orderItems.map(item => item.menu.name),
        }));
        const summaryTransactions = {
          explanation: "Jumlah transaksi dihitung berdasarkan total order yang telah diselesaikan dalam periode ini.",
          "Jumlah Transaksi": orders.length,
        };
        return res.status(200).json({ summary: summaryTransactions, details: detailsTransactions });

      case "gross":
        let totalSellingGross = 0;
        let totalHPPGross = 0;
        const itemDetailsGross = [];
        for (const order of orders) {
          for (const item of order.orderItems) {
            const sellingPrice = Number(item.menu.price);
            const hpp = Number(item.menu.hargaBakul);
            const quantity = item.quantity;
            const itemTotalSelling = sellingPrice * quantity;
            const itemTotalHPP = hpp * quantity;
            totalSellingGross += itemTotalSelling;
            totalHPPGross += itemTotalHPP;
            itemDetailsGross.push({
              orderId: order.id,
              orderDate: order.createdAt,
              menuName: item.menu.name,
              sellingPrice,
              quantity,
              itemTotalSelling,
              hpp,
              itemTotalHPP,
            });
          }
        }
        const summaryGross = {
          explanation: "Laba Kotor dihitung dengan mengurangi total HPP dari total penjualan normal (tanpa diskon).",
          "Total Penjualan": totalSellingGross,
          "Total HPP": totalHPPGross,
          "Laba Kotor": totalSellingGross - totalHPPGross,
        };
        return res.status(200).json({ summary: summaryGross, details: itemDetailsGross });

      case "net":
        let totalSellingNet = 0;
        let totalHPPNet = 0;
        let totalDiscountsNet = 0;
        let totalTaxNet = 0;
        let totalGratuityNet = 0;
        const itemDetailsNet = [];
        for (const order of orders) {
          const orderDiscount = Number(order.discountAmount || 0);
          const orderTax = Number(order.taxAmount || 0);
          const orderGratuity = Number(order.gratuityAmount || 0);
          const itemsCount = order.orderItems.length;
          const discountPerItem = itemsCount > 0 ? orderDiscount / itemsCount : 0;
          const taxPerItem = itemsCount > 0 ? orderTax / itemsCount : 0;
          const gratuityPerItem = itemsCount > 0 ? orderGratuity / itemsCount : 0;

          for (const item of order.orderItems) {
            const sellingPrice = Number(item.menu.price);
            const hpp = Number(item.menu.hargaBakul);
            const quantity = item.quantity;
            const itemTotalSelling = sellingPrice * quantity;
            const itemTotalHPP = hpp * quantity;
            const itemDiscount = discountPerItem;
            const itemTax = taxPerItem;
            const itemGratuity = gratuityPerItem;
            const itemNetProfit = (sellingPrice - hpp - itemDiscount + itemTax + itemGratuity) * quantity;

            totalSellingNet += itemTotalSelling;
            totalHPPNet += itemTotalHPP;
            totalDiscountsNet += itemDiscount * quantity;
            totalTaxNet += itemTax * quantity;
            totalGratuityNet += itemGratuity * quantity;

            itemDetailsNet.push({
              orderId: order.id,
              orderDate: order.createdAt,
              menuName: item.menu.name,
              sellingPrice,
              discount: itemDiscount,
              tax: itemTax,
              gratuity: itemGratuity,
              quantity,
              itemNetProfit,
            });
          }
        }
        const summaryNet = {
          explanation: "Laba Bersih dihitung dengan formula: (Harga Jual - HPP - Diskon + Pajak + Gratuity) per item dikalikan jumlah item.",
          "Total Penjualan": totalSellingNet,
          "Total HPP": totalHPPNet,
          "Total Diskon": totalDiscountsNet,
          "Total Pajak": totalTaxNet,
          "Total Gratuity": totalGratuityNet,
          "Laba Bersih": totalSellingNet - totalHPPNet - totalDiscountsNet + totalTaxNet + totalGratuityNet,
          "Formula": "Net Sales = Gross Sales - Discounts - Refunds (Refunds = 0)",
        };
        return res.status(200).json({ summary: summaryNet, details: itemDetailsNet });

      case "discounts":
        const totalDiscounts = orders.reduce((acc, order) => acc + Number(order.discountAmount || 0), 0);
        const summaryDiscounts = {
          explanation: "Total diskon dihitung dengan menjumlahkan discountAmount dari semua order yang berhasil diselesaikan.",
          "Total Diskon": totalDiscounts,
        };
        return res.status(200).json({ summary: summaryDiscounts, details: orders });

      case "tax":
        const totalTax = orders.reduce((acc, order) => acc + Number(order.taxAmount || 0), 0);
        const summaryTax = {
          explanation: "Total pajak dihitung dengan menjumlahkan taxAmount dari semua order yang berhasil diselesaikan.",
          "Total Pajak": totalTax,
        };
        return res.status(200).json({ summary: summaryTax, details: orders });

      case "gratuity":
        const totalGratuity = orders.reduce((acc, order) => acc + Number(order.gratuityAmount || 0), 0);
        const summaryGratuity = {
          explanation: "Total gratuity dihitung dengan menjumlahkan gratuityAmount dari semua order yang berhasil diselesaikan.",
          "Total Gratuity": totalGratuity,
        };
        return res.status(200).json({ summary: summaryGratuity, details: orders });

      default:
        return res.status(200).json({
          message: "Metric tidak dikenali. Menampilkan data order secara default.",
          details: orders,
        });
    }
  } catch (error) {
    console.error("Error fetching sales details:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}