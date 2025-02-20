import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type GrossMarginData = { date: string; grossMargin: number };

// Helper untuk mengagregasi orderItems dalam satu order (bundle-aware)
function aggregateOrderItems(orderItems: any[]): { totalHPP: number } {
  const aggregated = new Map<string, number>();
  // Untuk setiap order item:
  for (const item of orderItems) {
    if (item.bundle) {
      // Gunakan key berdasarkan bundleId (atau nama bundle)
      const key = `bundle_${item.bundle.id || item.bundle.name}`;
      // Hanya ambil quantity dari baris pertama, namun tambahkan HPP dari setiap komponen
      if (aggregated.has(key)) {
        aggregated.set(key, aggregated.get(key)! + (item.menu.hargaBakul * item.quantity));
      } else {
        aggregated.set(key, item.menu.hargaBakul * item.quantity);
      }
    } else {
      const key = `menu_${item.menu.id}`;
      aggregated.set(key, (aggregated.get(key) || 0) + (item.menu.hargaBakul * item.quantity));
    }
  }
  // Total HPP untuk order adalah penjumlahan seluruh nilai di map
  let total = 0;
  aggregated.forEach((val) => {
    total += val;
  });
  return { totalHPP: total };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  const { period, start, end } = req.query;
  try {
    const startDate = start ? new Date(start as string) : null;
    const endDate = end ? new Date(end as string) : null;

    // Ambil semua order CompletedOrder beserta orderItems, menu, dan bundle
    const orders = await prisma.completedOrder.findMany({
      where: {
        ...(startDate && { createdAt: { gte: startDate } }),
        ...(endDate && { createdAt: { lte: endDate } }),
      },
      include: {
        orderItems: {
          include: {
            menu: true,
            bundle: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Kelompokkan order berdasarkan tanggal sesuai periode
    const groups = new Map<string, { netSales: number; totalHPP: number }>();
    orders.forEach(order => {
      let groupKey = "";
      const orderDate = new Date(order.createdAt);
      if (period === "daily") {
        groupKey = orderDate.toISOString().split("T")[0];
      } else if (period === "weekly") {
        // Misal format: "YYYY-Wxx"
        const year = orderDate.getFullYear();
        const week = String(Math.ceil((orderDate.getDate() + orderDate.getDay()) / 7)).padStart(2, "0");
        groupKey = `${year}-W${week}`;
      } else if (period === "monthly") {
        groupKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, "0")}`;
      } else if (period === "yearly") {
        groupKey = `${orderDate.getFullYear()}`;
      }

      // Jika order memiliki orderItems, hitung aggregated HPP untuk order tersebut
      if (order.orderItems.length > 0) {
        const { totalHPP } = aggregateOrderItems(order.orderItems);
        // Karena netSales untuk order dihitung hanya sekali (dari co.total)
        if (groups.has(groupKey)) {
          const group = groups.get(groupKey)!;
          group.netSales += order.total;
          group.totalHPP += totalHPP;
        } else {
          groups.set(groupKey, { netSales: order.total, totalHPP });
        }
      }
    });

    // Buat array hasil berdasarkan groups, hitung gross margin per grup
    const result: GrossMarginData[] = [];
    groups.forEach((value, key) => {
      const gm = value.netSales > 0 ? ((value.netSales - value.totalHPP) / value.netSales) * 100 : 0;
      result.push({ date: key, grossMargin: gm });
    });

    // Urutkan berdasarkan tanggal (jika diperlukan)
    result.sort((a, b) => a.date.localeCompare(b.date));
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching gross margin data:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
