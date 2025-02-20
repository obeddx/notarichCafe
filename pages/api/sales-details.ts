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

/**
 * Fungsi helper untuk mengagregasi orderItems:
 * - Jika item memiliki bundleId, kelompokkan berdasarkan bundle tersebut.
 * - Untuk bundle, gunakan quantity dari baris pertama dan jumlahkan HPP dari tiap komponen.
 * - Untuk item biasa, jumlahkan quantity dan HPP.
 */
function aggregateOrderItems(orderItems: any[]) {
  const aggregated = new Map<string, any>();

  for (const item of orderItems) {
    if (item.bundleId) {
      const key = `bundle_${item.bundleId}`;
      if (aggregated.has(key)) {
        const agg = aggregated.get(key);
        // Jangan menambahkan quantity lagi; cukup jumlahkan HPP
        agg.totalHPP += Number(item.menu.hargaBakul) * item.quantity;
      } else {
        aggregated.set(key, {
          isBundle: true,
          bundleId: item.bundleId,
          name: item.bundle ? item.bundle.name : `Bundle ${item.bundleId}`,
          sellingPrice: item.bundle ? item.bundle.bundlePrice : item.menu.price,
          quantity: item.quantity, // gunakan quantity dari baris pertama
          totalHPP: Number(item.menu.hargaBakul) * item.quantity,
        });
      }
    } else {
      const key = `menu_${item.menu.id}`;
      if (aggregated.has(key)) {
        const agg = aggregated.get(key);
        agg.quantity += item.quantity;
        agg.totalHPP += Number(item.menu.hargaBakul) * item.quantity;
      } else {
        aggregated.set(key, {
          isBundle: false,
          menuId: item.menu.id,
          name: item.menu.name,
          sellingPrice: Number(item.menu.price),
          quantity: item.quantity,
          totalHPP: Number(item.menu.hargaBakul) * item.quantity,
        });
      }
    }
  }
  return Array.from(aggregated.values());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { metric, period = "daily", date = new Date().toISOString() } = req.query;
    const { startDate, endDate } = getStartAndEndDates(period as string, date as string);

    // Ambil order beserta orderItems (termasuk relasi menu dan bundle)
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
            bundle: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (metric === "sales") {
      // Untuk metric sales, agregasikan orderItems per order
      const aggregatedOrders = orders.map(order => {
        const aggregatedItems = aggregateOrderItems(order.orderItems);
        // Buat representasi string untuk tiap item atau bundle
        const itemsStr = aggregatedItems.map(
          (item: any) => `${item.name} x${item.quantity}`
        );
        return {
          id: order.id,
          createdAt: order.createdAt,
          total: order.total,
          items: itemsStr,
        };
      });
      const totalSales = orders.reduce((acc, order) => acc + Number(order.total), 0);
      const orderCount = orders.length;
      const summary = {
        explanation:
          "Total penjualan dihitung dengan menjumlahkan nilai total dari setiap order yang berhasil diselesaikan. Detail di bawah menampilkan tanggal order, total penjualan, dan item (atau bundle) yang terjual.",
        "Total Penjualan": totalSales,
        "Jumlah Pesanan": orderCount,
      };
      return res.status(200).json({ summary, details: aggregatedOrders });
    } else if (metric === "transactions") {
      // Untuk transaksi, agregasikan orderItems untuk mendapatkan jumlah item dan daftar nama (telah dikelompokkan)
      const details = orders.map(order => {
        const aggregatedItems = aggregateOrderItems(order.orderItems);
        const itemCount = aggregatedItems.reduce(
          (acc, item) => acc + item.quantity,
          0
        );
        const menus = aggregatedItems.map((item) => item.name);
        return {
          id: order.id,
          createdAt: order.createdAt,
          total: order.total,
          itemCount,
          menus,
        };
      });
      const orderCount = orders.length;
      const summary = {
        explanation:
          "Jumlah transaksi dihitung berdasarkan total order yang telah diselesaikan dalam periode ini. Detail di bawah menampilkan tanggal, total penjualan, jumlah item (atau bundle), dan daftar menu/bundle yang dipesan.",
        "Jumlah Transaksi": orderCount,
      };
      return res.status(200).json({ summary, details });
    } else if (metric === "gross" || metric === "net") {
      // Untuk gross/net, buat daftar detail per order (agregasi per order, baik menu maupun bundle)
      const itemDetails = [];
      for (const order of orders) {
        const aggregatedItems = aggregateOrderItems(order.orderItems);
        for (const agg of aggregatedItems) {
          const sellingPrice = agg.sellingPrice;
          const quantity = agg.quantity;
          const itemTotalSelling = sellingPrice * quantity;
          const hpp = agg.totalHPP;
          itemDetails.push({
            orderId: order.id,
            orderDate: order.createdAt,
            menuName: agg.name,
            sellingPrice,
            quantity,
            itemTotalSelling,
            hpp,
            itemTotalHPP: hpp,
          });
        }
      }
      const totalSelling = itemDetails.reduce(
        (acc, item) => acc + item.itemTotalSelling,
        0
      );
      const totalHPP = itemDetails.reduce(
        (acc, item) => acc + item.itemTotalHPP,
        0
      );
      const profit = totalSelling - totalHPP;
      const summary = {
        explanation:
          metric === "gross"
            ? "Laba Kotor dihitung dengan mengurangi total HPP dari total penjualan. Detail di bawah menampilkan tiap menu atau bundle yang dibeli, harga jual, dan perhitungan tiap item."
            : "Laba Bersih sama dengan Laba Kotor karena belum ada pengurangan biaya lain. Detail di bawah menampilkan tiap menu atau bundle yang dibeli, harga jual, dan perhitungan tiap item.",
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
