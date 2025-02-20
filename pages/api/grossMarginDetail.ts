import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper untuk mengagregasi orderItems dalam satu order (bundle-aware)
function aggregateOrderItems(orderItems: any[]): any[] {
  const aggregated = new Map<string, any>();
  for (const item of orderItems) {
    if (item.bundle) {
      const key = `bundle_${item.bundle.id || item.bundle.name}`;
      if (aggregated.has(key)) {
        const agg = aggregated.get(key);
        // Jangan tambah quantity lagi (cukup ambil dari baris pertama), hanya jumlahkan HPP
        agg.hpp += item.menu.hargaBakul * item.quantity;
        agg.totalSales += 0; // Karena harga jual sudah diambil dari baris pertama
      } else {
        aggregated.set(key, {
          menuName: item.bundle.name,
          quantity: item.quantity, // ambil quantity dari baris pertama
          sellingPrice: item.bundle.bundlePrice, // gunakan harga bundle
          hpp: item.menu.hargaBakul * item.quantity,
          totalSales: item.bundle.bundlePrice * item.quantity,
        });
      }
    } else {
      const key = `menu_${item.menu.id}`;
      if (aggregated.has(key)) {
        const agg = aggregated.get(key);
        agg.quantity += item.quantity;
        agg.hpp += item.menu.hargaBakul * item.quantity;
        agg.totalSales += item.menu.price * item.quantity;
      } else {
        aggregated.set(key, {
          menuName: item.menu.name,
          quantity: item.quantity,
          sellingPrice: item.menu.price,
          hpp: item.menu.hargaBakul * item.quantity,
          totalSales: item.menu.price * item.quantity,
        });
      }
    }
  }
  return Array.from(aggregated.values());
}

// Fungsi untuk menggabungkan agregasi dari seluruh order (global aggregation)
function aggregateGlobal(itemsArrays: any[][]): any[] {
  const globalMap = new Map<string, any>();
  for (const items of itemsArrays) {
    for (const item of items) {
      const key = item.menuName;
      if (globalMap.has(key)) {
        const agg = globalMap.get(key);
        agg.quantity += item.quantity;
        agg.hpp += item.hpp;
        agg.totalSales += item.totalSales;
      } else {
        globalMap.set(key, { ...item });
      }
    }
  }
  return Array.from(globalMap.values());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { date, period } = req.query;
  if (!date || !period) {
    return res.status(400).json({ error: "Missing date or period" });
  }

  let startDate: Date;
  let endDate: Date;
  try {
    if (period === "daily") {
      startDate = new Date(date as string);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else if (period === "weekly") {
      // Misal format "YYYY-Wxx"
      // Fungsi helper sederhana untuk mendapatkan tanggal awal minggu
      const [yearStr, weekStr] = (date as string).split("-W");
      const year = Number(yearStr);
      const week = Number(weekStr);
      const simple = new Date(year, 0, 1 + (week - 1) * 7);
      const dow = simple.getDay();
      startDate = new Date(simple);
      startDate.setDate(dow === 0 ? simple.getDate() + 1 : simple.getDate() - dow + 1);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
    } else if (period === "monthly") {
      const [year, month] = (date as string).split("-");
      startDate = new Date(Number(year), Number(month) - 1, 1);
      endDate = new Date(Number(year), Number(month), 1);
    } else if (period === "yearly") {
      const year = Number(date as string);
      startDate = new Date(year, 0, 1);
      endDate = new Date(year + 1, 0, 1);
    } else {
      startDate = new Date(date as string);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    }

    // Summary: hitung total netSales dan totalHPP dari CompletedOrder
    const summaryRaw: any[] = await prisma.$queryRaw`
      SELECT 
        SUM(total) as netSales,
        COUNT(*) as totalOrders
      FROM CompletedOrder
      WHERE createdAt >= ${startDate} AND createdAt < ${endDate}
    `;
    const netSales = summaryRaw && summaryRaw.length > 0 ? Number(summaryRaw[0].netSales) || 0 : 0;

    // Ambil orders beserta orderItems (dengan menu dan bundle)
    const orders = await prisma.completedOrder.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        orderItems: {
          select: {
            quantity: true,
            menu: {
              select: {
                name: true,
                price: true,
                hargaBakul: true,
              },
            },
            bundle: {
              select: {
                name: true,
                bundlePrice: true,
                id: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Untuk tiap order, agregasikan orderItems
    const aggregatedOrders = orders.map(o => aggregateOrderItems(o.orderItems));
    // Gabungkan agregasi dari seluruh order secara global
    const globalAggregated = aggregateGlobal(aggregatedOrders);

    // Hitung total HPP global dari hasil agregasi
    const totalHPP = globalAggregated.reduce((sum, item) => sum + item.hpp, 0);
    const grossMargin = netSales > 0 ? ((netSales - totalHPP) / netSales) * 100 : 0;

    return res.status(200).json({
      summary: { netSales, totalHPP, grossMargin },
      details: globalAggregated,
    });
  } catch (error) {
    console.error("Error fetching gross margin detail:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
