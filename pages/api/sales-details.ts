// File: pages/api/sales-details.ts

import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getStartAndEndDates(period: string, dateString: string): { startDate: Date; endDate: Date } {
  const date = new Date(dateString);
  let startDate: Date, endDate: Date;

  switch (period) {
    case "daily":
      startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);
      break;
    case "weekly": {
      const day = date.getDay();
      const diff = date.getDate() - (day === 0 ? 6 : day - 1);
      startDate = new Date(date.getFullYear(), date.getMonth(), diff);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
      break;
    }
    case "monthly":
      startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      endDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      break;
    case "yearly":
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

    // Ambil order beserta detail orderItems dan relasinya ke menu
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

    if (metric === "sales") {
      const totalSales = orders.reduce((acc, order) => acc + Number(order.total), 0);
      const orderCount = orders.length;
      const summary = {
        explanation:
          "Total penjualan dihitung dengan menjumlahkan nilai total dari setiap order yang berhasil diselesaikan. Detail di bawah menampilkan tanggal order, total penjualan, dan item yang terjual.",
        "Total Penjualan": totalSales,
        "Jumlah Pesanan": orderCount,
      };
      return res.status(200).json({ summary, details: orders });
    } else if (metric === "transactions") {
      // Untuk transaksi, tambahkan juga daftar nama menu pada tiap order.
      const details = orders.map(order => ({
        id: order.id,
        createdAt: order.createdAt,
        total: order.total,
        itemCount: order.orderItems.reduce((acc, item) => acc + item.quantity, 0),
        menus: order.orderItems.map(item => item.menu.name)
      }));
      const orderCount = orders.length;
      const summary = {
        explanation:
          "Jumlah transaksi dihitung berdasarkan total order yang telah diselesaikan dalam periode ini. Detail di bawah menampilkan tanggal, total penjualan, jumlah item, dan daftar menu yang dipesan.",
        "Jumlah Transaksi": orderCount,
      };
      return res.status(200).json({ summary, details });
    } else if (metric === "gross" || metric === "net") {
      let totalSelling = 0;
      let totalHPP = 0;
      const itemDetails = [];
      for (const order of orders) {
        for (const item of order.orderItems) {
          const sellingPrice = Number(item.menu.price) || 0;
          const hpp = Number(item.menu.hargaBakul) || 0;
          const quantity = item.quantity;
          const itemTotalSelling = sellingPrice * quantity;
          const itemTotalHPP = hpp * quantity;
          totalSelling += itemTotalSelling;
          totalHPP += itemTotalHPP;
          itemDetails.push({
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
      const profit = totalSelling - totalHPP;
      const summary = {
        explanation:
          metric === "gross"
            ? "Laba Kotor dihitung dengan mengurangi total HPP dari total penjualan. Detail di bawah menampilkan tiap menu yang dibeli, harga jual, harga bakul (HPP), dan perhitungan tiap item."
            : "Laba Bersih sama dengan Laba Kotor karena belum ada pengurangan biaya lain. Detail di bawah menampilkan tiap menu yang dibeli, harga jual, harga bakul (HPP), dan perhitungan tiap item.",
        "Total Penjualan": totalSelling,
        "Total HPP": totalHPP,
        "Perhitungan Laba": `(${totalSelling} - ${totalHPP}) = ${profit}`,
      };
      return res.status(200).json({ summary, details: itemDetails });
    } else {
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
