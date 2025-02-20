import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Fungsi untuk mengonversi ISO week (misal "2023-W12") ke tanggal awal minggu (Senin)
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
 * Fungsi helper untuk mengagregasi orderItems per order.
 * - Jika item memiliki bundle (non-null), maka gunakan key "bundle_{bundle.id}" dan
 *   ambil quantity dari baris pertama per order (untuk bundle tersebut).
 * - Jika item biasa, jumlahkan quantity secara normal.
 */
function aggregateOrderItemsForOrder(orderItems: any[]): {
  key: string;
  menuName: string;
  sellingPrice: number;
  quantity: number;
  totalSales: number;
}[] {
  const map = new Map<string, any>();
  for (const item of orderItems) {
    if (item.bundle) {
      // Gunakan key berdasarkan bundle id
      const key = `bundle_${item.bundle.id}`;
      // Pastikan dalam satu order, jika sudah ada, jangan menambahkan quantity lagi
      if (!map.has(key)) {
        map.set(key, {
          key,
          menuName: item.bundle.name,
          sellingPrice: item.bundle.bundlePrice,
          quantity: item.quantity, // ambil quantity dari baris pertama (diasumsikan sama)
          totalSales: item.bundle.bundlePrice * item.quantity,
          isBundle: true,
        });
      }
    } else {
      const key = `menu_${item.menu.id}`;
      if (map.has(key)) {
        const agg = map.get(key);
        agg.quantity += item.quantity;
        agg.totalSales += item.menu.price * item.quantity;
      } else {
        map.set(key, {
          key,
          menuName: item.menu.name,
          sellingPrice: item.menu.price,
          quantity: item.quantity,
          totalSales: item.menu.price * item.quantity,
          isBundle: false,
        });
      }
    }
  }
  return Array.from(map.values());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const { date, period } = req.query;
    if (!date || !period) {
      return res.status(400).json({ error: "Date and period are required" });
    }

    let startDate: Date;
    let endDate: Date;

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
      const year = Number(date as string);
      startDate = new Date(year, 0, 1);
      endDate = new Date(year + 1, 0, 1);
    } else {
      // Default (daily)
      startDate = new Date(date as string);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    }

    try {
      // Dapatkan semua order dalam rentang waktu
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
        orderBy: { createdAt: "desc" },
      });

      const transactionCount = orders.length;
      let netSales = 0;
      orders.forEach((order) => {
        netSales += order.total;
      });
      const salesPerTransaction =
        transactionCount > 0 ? netSales / transactionCount : 0;

      // Untuk setiap order, agregasikan orderItems menggunakan helper
      const globalMap = new Map<string, any>();
      orders.forEach((order) => {
        const aggregatedItems = aggregateOrderItemsForOrder(order.orderItems);
        aggregatedItems.forEach((agg) => {
          const key = agg.key; // key sudah mencakup tipe (bundle/menu) dan id
          if (globalMap.has(key)) {
            const existing = globalMap.get(key);
            existing.quantity += agg.quantity;
            existing.totalSales += agg.totalSales;
          } else {
            globalMap.set(key, { ...agg });
          }
        });
      });
      const details = Array.from(globalMap.values());

      return res.status(200).json({
        summary: { netSales, transactionCount, salesPerTransaction },
        details,
      });
    } catch (error) {
      console.error("Error fetching sales detail:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
  return res.status(405).json({ error: "Method not allowed" });
}
