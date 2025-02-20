import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { subDays, startOfWeek, startOfMonth } from "date-fns";

const prisma = new PrismaClient();

// Fungsi helper untuk mendapatkan awal minggu ISO (Senin) dari string ISO week, misal "2023-W12"
function getStartOfISOWeek(isoWeek: string): Date {
  const [yearStr, weekStr] = isoWeek.split("-W");
  const year = Number(yearStr);
  const week = Number(weekStr);
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay(); // 0 (Minggu) sampai 6 (Sabtu)
  const ISOweekStart = new Date(simple);
  if (dow === 0) {
    ISOweekStart.setDate(simple.getDate() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() - dow + 1);
  }
  return ISOweekStart;
}

/**
 * Fungsi helper untuk mengagregasi penjualan dari CompletedOrderItem.
 * Untuk item bundle, hindari double count (misalnya, jika satu order memuat 2 baris untuk 1 bundle, 
 * quantity hanya diambil sekali per order). Untuk menu biasa, jumlahkan quantity secara normal.
 */
function aggregateTopSellers(orderItems: any[]) {
  // Pertama, kelompokkan item bundle berdasarkan order sehingga setiap order hanya dihitung sekali.
  const bundleSalesMap = new Map<string, number>(); // key: `${orderId}-${bundleId}`, value: quantity (ambil dari baris pertama)
  const menuSalesMap = new Map<string, number>(); // key: `${orderId}-${menuId}`, value: jumlah quantity

  for (const item of orderItems) {
    if (item.bundleId) {
      const key = `${item.orderId}-${item.bundleId}`;
      if (!bundleSalesMap.has(key)) {
        bundleSalesMap.set(key, item.quantity);
      }
      // Jangan menjumlahkan quantity lagi untuk baris bundle di order yang sama
    } else {
      const key = `${item.orderId}-${item.menu.id}`;
      menuSalesMap.set(key, (menuSalesMap.get(key) || 0) + item.quantity);
    }
  }

  // Sekarang, aggregrasikan per jenis (bundle dan menu) secara global
  const globalMap = new Map<string, { menuName: string; totalSold: number }>();

  // Agregasi untuk bundle: kelompokkan berdasarkan bundleId
  for (const [key, qty] of bundleSalesMap.entries()) {
    const parts = key.split("-");
    const bundleId = parts[1];
    // Cari salah satu item yang sesuai untuk mendapatkan nama bundle
    const item = orderItems.find(
      (i) =>
        i.orderId.toString() === parts[0] &&
        i.bundleId &&
        i.bundleId.toString() === bundleId
    );
    if (item) {
      const globalKey = `bundle_${bundleId}`;
      if (globalMap.has(globalKey)) {
        globalMap.get(globalKey)!.totalSold += qty;
      } else {
        globalMap.set(globalKey, {
          menuName: item.bundle ? item.bundle.name : `Bundle ${bundleId}`,
          totalSold: qty,
        });
      }
    }
  }

  // Agregasi untuk menu
  for (const [key, qty] of menuSalesMap.entries()) {
    const parts = key.split("-");
    const menuId = parts[1];
    const item = orderItems.find(
      (i) => !i.bundleId && i.menu.id.toString() === menuId
    );
    if (item) {
      const globalKey = `menu_${menuId}`;
      if (globalMap.has(globalKey)) {
        globalMap.get(globalKey)!.totalSold += qty;
      } else {
        globalMap.set(globalKey, {
          menuName: item.menu.name,
          totalSold: qty,
        });
      }
    }
  }

  return Array.from(globalMap.values());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { period = "daily", date, start, end } = req.query;
    let startDate: Date;
    let endDate: Date;

    // Prioritaskan parameter 'date' tunggal jika tersedia
    if (date) {
      const dateStr = date as string;
      if (period === "daily") {
        startDate = new Date(dateStr);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
      } else if (period === "weekly") {
        // Asumsikan format date: "YYYY-Wxx"
        startDate = getStartOfISOWeek(dateStr);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);
      } else if (period === "monthly") {
        // Asumsikan format date: "YYYY-MM"
        const [year, month] = dateStr.split("-");
        startDate = new Date(Number(year), Number(month) - 1, 1);
        endDate = new Date(Number(year), Number(month), 1);
      } else if (period === "yearly") {
        // Asumsikan format date: "YYYY"
        startDate = new Date(Number(dateStr), 0, 1);
        endDate = new Date(Number(dateStr) + 1, 0, 1);
      } else {
        startDate = new Date(dateStr);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
      }
    } else if (start && end) {
      startDate = new Date(start as string);
      endDate = new Date(end as string);
    } else {
      // Jika tidak ada parameter date maupun start/end, gunakan default berdasarkan periode
      if (period === "daily") {
        startDate = subDays(new Date(), 1);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
      } else if (period === "weekly") {
        startDate = startOfWeek(new Date());
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);
      } else if (period === "monthly") {
        startDate = startOfMonth(new Date());
        endDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
      } else if (period === "yearly") {
        startDate = new Date(new Date().getFullYear(), 0, 1);
        endDate = new Date(new Date().getFullYear() + 1, 0, 1);
      } else {
        startDate = subDays(new Date(), 1);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
      }
    }

    // Ambil semua CompletedOrderItem untuk periode tersebut, sertakan relasi menu, bundle, dan order (untuk orderId)
    const orderItems = await prisma.completedOrderItem.findMany({
      where: {
        order: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        menu: true,
        bundle: true,
        order: true,
      },
    });

    // Agregasikan penjualan menggunakan fungsi helper
    const aggregated = aggregateTopSellers(orderItems);
    // Urutkan berdasarkan totalSold menurun, ambil 5 teratas
    aggregated.sort((a, b) => b.totalSold - a.totalSold);
    const topSellers = aggregated.slice(0, 5);

    // Hitung total order dan total pendapatan (meski tidak digunakan di UI)
    const totalOrders = await prisma.completedOrder.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    const totalRevenueResult = await prisma.completedOrder.aggregate({
      _sum: {
        total: true,
      },
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    const totalRevenue = totalRevenueResult._sum.total || 0;

    res.status(200).json({
      topSellers,
      totalOrders,
      totalRevenue,
    });
  } catch (error) {
    console.error("Error fetching top sellers:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
