// pages/api/sales-details.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Interface untuk hasil Prisma
interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  discountAmount: number;
  menu: {
    id: number;
    name: string;
    price: number;
    hargaBakul: number;
    type: string; // Sesuaikan dengan enum $Enums.MenuType jika ada
    description: string | null;
    image: string;
    category: string;
    Status: string;
    maxBeli: number;
    isActive: boolean;
  };
}

interface Order {
  id: number;
  createdAt: Date;
  total: number;
  discountAmount: number;
  taxAmount: number;
  gratuityAmount: number;
  finalTotal: number;
  orderItems: OrderItem[];
}

interface TransactionDetail {
  id: number;
  createdAt: string;
  total: number;
  itemCount: number;
  menus: string[];
}

interface GrossDetail {
  orderId: number;
  orderDate: string;
  menuName: string;
  itemId: number; 
  sellingPrice: number;
  quantity: number;
  itemTotalSelling: number;
  hpp: number;
  itemTotalHPP: number;
}

interface NetDetail {
  orderId: number;
  orderDate: string;
  menuName: string;
  itemId: number; 
  sellingPrice: number;
  discount: number;
  tax: number;
  gratuity: number;
  quantity: number;
  itemNetProfit: number;
}

interface SalesDetailsResponse {
  summary?: { explanation: string; [key: string]: string | number };
  details: Order[] | TransactionDetail[] | GrossDetail[] | NetDetail[];
  message?: string;
}

function getStartAndEndDates(
  period: string,
  dateString: string
): { startDate: Date; endDate: Date } {
  const date = new Date(dateString);
  let startDate: Date;
  let endDate: Date;

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

    const orders: Order[] = await prisma.completedOrder.findMany({
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
          explanation:
            "Total penjualan dihitung dengan menjumlahkan nilai finalTotal dari setiap order yang berhasil diselesaikan, termasuk efek diskon, pajak, dan gratuity.",
          "Total Penjualan": totalSales,
          "Jumlah Pesanan": orders.length,
        };
        const salesResponse: SalesDetailsResponse = { summary: summarySales, details: orders };
        return res.status(200).json(salesResponse);

      case "transactions":
        const detailsTransactions: TransactionDetail[] = orders.map((order) => ({
          id: order.id,
          createdAt: order.createdAt.toISOString(),
          total: order.finalTotal,
          itemCount: order.orderItems.reduce((acc, item) => acc + item.quantity, 0),
          menus: order.orderItems.map((item) => item.menu.name),
        }));
        const summaryTransactions = {
          explanation:
            "Jumlah transaksi dihitung berdasarkan total order yang telah diselesaikan dalam periode ini.",
          "Jumlah Transaksi": orders.length,
        };
        const transactionsResponse: SalesDetailsResponse = {
          summary: summaryTransactions,
          details: detailsTransactions,
        };
        return res.status(200).json(transactionsResponse);

        case "gross":
          let totalSellingGross = 0;
          let totalHPPGross = 0;
          const itemDetailsGross: GrossDetail[] = [];
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
                orderDate: order.createdAt.toISOString(),
                menuName: item.menu.name,
                itemId: item.id, // Tambahkan item.id
                sellingPrice,
                quantity,
                itemTotalSelling,
                hpp,
                itemTotalHPP,
              });
            }
          }
        const summaryGross = {
          explanation:
            "Laba Kotor dihitung dengan mengurangi total HPP dari total penjualan normal (tanpa diskon).",
          "Total Penjualan": totalSellingGross,
          "Total HPP": totalHPPGross,
          "Laba Kotor": totalSellingGross - totalHPPGross,
        };
        const grossResponse: SalesDetailsResponse = {
          summary: summaryGross,
          details: itemDetailsGross,
        };
        return res.status(200).json(grossResponse);

        case "net":
          let totalSellingNet = 0;
          let totalHPPNet = 0;
          let totalDiscountsNet = 0;
          let totalTaxNet = 0;
          let totalGratuityNet = 0;
          const itemDetailsNet: NetDetail[] = [];
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
                orderDate: order.createdAt.toISOString(),
                menuName: item.menu.name,
                itemId: item.id, // Tambahkan item.id
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
          explanation:
            "Laba Bersih dihitung dengan formula: (Harga Jual - HPP - Diskon + Pajak + Gratuity) per item dikalikan jumlah item.",
          "Total Penjualan": totalSellingNet,
          "Total HPP": totalHPPNet,
          "Total Diskon": totalDiscountsNet,
          "Total Pajak": totalTaxNet,
          "Total Gratuity": totalGratuityNet,
          "Laba Bersih":
            totalSellingNet - totalHPPNet - totalDiscountsNet + totalTaxNet + totalGratuityNet,
          "Formula": "Net Sales = Gross Sales - Discounts - Refunds (Refunds = 0)",
        };
        const netResponse: SalesDetailsResponse = { summary: summaryNet, details: itemDetailsNet };
        return res.status(200).json(netResponse);

      case "discounts":
        const totalDiscounts = orders.reduce(
          (acc, order) => acc + Number(order.discountAmount || 0),
          0
        );
        const summaryDiscounts = {
          explanation:
            "Total diskon dihitung dengan menjumlahkan discountAmount dari semua order yang berhasil diselesaikan.",
          "Total Diskon": totalDiscounts,
        };
        const discountsResponse: SalesDetailsResponse = {
          summary: summaryDiscounts,
          details: orders,
        };
        return res.status(200).json(discountsResponse);

      case "tax":
        const totalTax = orders.reduce((acc, order) => acc + Number(order.taxAmount || 0), 0);
        const summaryTax = {
          explanation:
            "Total pajak dihitung dengan menjumlahkan taxAmount dari semua order yang berhasil diselesaikan.",
          "Total Pajak": totalTax,
        };
        const taxResponse: SalesDetailsResponse = { summary: summaryTax, details: orders };
        return res.status(200).json(taxResponse);

      case "gratuity":
        const totalGratuity = orders.reduce(
          (acc, order) => acc + Number(order.gratuityAmount || 0),
          0
        );
        const summaryGratuity = {
          explanation:
            "Total gratuity dihitung dengan menjumlahkan gratuityAmount dari semua order yang berhasil diselesaikan.",
          "Total Gratuity": totalGratuity,
        };
        const gratuityResponse: SalesDetailsResponse = {
          summary: summaryGratuity,
          details: orders,
        };
        return res.status(200).json(gratuityResponse);

      default:
        const defaultResponse: SalesDetailsResponse = {
          message: "Metric tidak dikenali. Menampilkan data order secara default.",
          details: orders,
        };
        return res.status(200).json(defaultResponse);
    }
  } catch (error) {
    console.error("Error fetching sales details:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}