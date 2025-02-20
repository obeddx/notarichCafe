import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper: untuk mendapatkan awal minggu ISO (Senin) dari format "YYYY-Wxx"
function getStartOfISOWeek(isoWeek: string): Date {
  const [yearStr, weekStr] = isoWeek.split("-W");
  const year = Number(yearStr);
  const week = Number(weekStr);
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = new Date(simple);
  if (dow === 0) {
    ISOweekStart.setDate(simple.getDate() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() - dow + 1);
  }
  return ISOweekStart;
}

/**
 * Fungsi helper untuk mengagregasi orderItems.
 * - Jika item memiliki data bundle (bukan null), maka:
 *    • Quantity diambil dari baris pertama per bundle (untuk satu order).
 *    • HPP dijumlahkan dari tiap baris komponen bundle.
 * - Jika item biasa, jumlahkan quantity dan HPP secara normal.
 */
function aggregateOrderItems(orderItems: any[]) {
  const aggregated = new Map<string, any>();
  for (const item of orderItems) {
    if (item.bundle) {
      // gunakan key berdasarkan nama bundle (bisa juga bundleId)
      const key = `bundle_${item.bundle.name}`;
      if (aggregated.has(key)) {
        const agg = aggregated.get(key);
        // Jangan menambahkan quantity lagi, hanya tambahkan HPP
        agg.hpp += item.menu.hargaBakul * item.quantity;
      } else {
        aggregated.set(key, {
          menuName: item.bundle.name,
          quantity: item.quantity, // ambil quantity dari baris pertama
          price: item.bundle.bundlePrice, // gunakan harga bundle
          hpp: item.menu.hargaBakul * item.quantity,
        });
      }
    } else {
      const key = `menu_${item.menu.name}`;
      if (aggregated.has(key)) {
        const agg = aggregated.get(key);
        agg.quantity += item.quantity;
        agg.hpp += item.menu.hargaBakul * item.quantity;
      } else {
        aggregated.set(key, {
          menuName: item.menu.name,
          quantity: item.quantity,
          price: item.menu.price,
          hpp: item.menu.hargaBakul * item.quantity,
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
      startDate = getStartOfISOWeek(date as string);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
    } else if (period === "monthly") {
      const [year, month] = (date as string).split("-");
      startDate = new Date(Number(year), Number(month) - 1, 1);
      endDate = new Date(Number(year), Number(month), 1);
    } else if (period === "yearly") {
      const year = Number(date);
      startDate = new Date(year, 0, 1);
      endDate = new Date(year + 1, 0, 1);
    } else {
      // fallback daily
      startDate = new Date(date as string);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    }

    // Summary: total orders dan total sales dari CompletedOrder
    const summaryRaw: any[] = await prisma.$queryRaw`
      SELECT COUNT(*) as totalOrders, SUM(total) as totalSales
      FROM CompletedOrder
      WHERE createdAt >= ${startDate} AND createdAt < ${endDate}
    `;
    const summary = summaryRaw && summaryRaw.length > 0
      ? {
          totalSales: Number(summaryRaw[0].totalSales) || 0,
          totalOrders: Number(summaryRaw[0].totalOrders) || 0,
        }
      : { totalSales: 0, totalOrders: 0 };

    // Ambil orders beserta orderItems dengan include data menu dan bundle
    const orders = await prisma.completedOrder.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        id: true,
        createdAt: true,
        total: true,
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
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Untuk setiap order, agregasikan orderItems dengan logika bundle
    const formattedOrders = orders.map((o) => {
      const aggregatedItems = aggregateOrderItems(o.orderItems);
      return {
        orderId: o.id,
        createdAt: o.createdAt,
        total: o.total,
        items: aggregatedItems,
      };
    });

    return res.status(200).json({
      summary,
      orders: formattedOrders,
    });
  } catch (error) {
    console.error("Error fetching sales detail:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
