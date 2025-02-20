import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const { category, start, end } = req.query;
    if (!category) {
      return res.status(400).json({ error: "Category is required" });
    }
    const cat = category as string;
    // Buat filter untuk order.createdAt
    const dateFilter = {
      ...(start ? { gte: new Date(start as string) } : {}),
      ...(end ? { lt: new Date(end as string) } : {}),
    };

    // Tipe detail item
    type DetailItem = {
      orderId: number;
      orderDate: Date;
      menuName: string;
      quantity: number;
      revenue: number;
    };

    let details: DetailItem[] = [];
    let totalRevenue = 0;
    let totalOrders = 0;

    if (cat === "Bundle") {
      // Ambil order item dengan bundleId tidak null dan filter berdasarkan order.createdAt
      const bundleItems = await prisma.completedOrderItem.findMany({
        where: {
          bundleId: { not: null },
          order: {
            createdAt: dateFilter,
          },
        },
        include: {
          bundle: { select: { id: true, bundlePrice: true, name: true } },
          order: { select: { id: true, createdAt: true } },
        },
      }) as Array<{
        order: { id: number; createdAt: Date };
        bundle: { id: number; bundlePrice: number | null; name: string } | null;
        orderId: number;
        bundleId: number | null;
        quantity: number;
      }>;

      // Agregasi per kombinasi unik orderId-bundleId
      const bundleMap = new Map<string, DetailItem>();
      for (const item of bundleItems) {
        // Pastikan properti bundle ada
        if (!item.bundle) continue;
        const key = `${item.orderId}-${item.bundleId}`;
        // Jika sudah ada, lewati baris tambahan untuk kombinasi yang sama
        if (bundleMap.has(key)) continue;
        const qty = item.quantity; // gunakan quantity dari baris pertama
        const price = Number(item.bundle.bundlePrice) || 0;
        bundleMap.set(key, {
          orderId: item.orderId,
          orderDate: item.order.createdAt,
          menuName: item.bundle.name, // gunakan nama bundle
          quantity: qty,
          revenue: price * qty,
        });
      }
      totalOrders = bundleMap.size;
      totalRevenue = 0;
      bundleMap.forEach((value) => {
        totalRevenue += value.revenue;
      });
      details = Array.from(bundleMap.values());
    } else {
      // Untuk kategori selain "Bundle": ambil order item yang merupakan menu biasa
      const menuItems = await prisma.completedOrderItem.findMany({
        where: {
          bundleId: null,
          menu: { category: cat },
          order: {
            createdAt: dateFilter,
          },
        },
        include: {
          menu: { select: { name: true, price: true } },
          order: { select: { id: true, createdAt: true } },
        },
      }) as Array<{
        order: { id: number; createdAt: Date };
        menu: { name: string; price: number };
        quantity: number;
      }>;
      totalOrders = menuItems.length;
      menuItems.forEach((item) => {
        const revenue = Number(item.menu.price) * item.quantity;
        totalRevenue += revenue;
        details.push({
          orderId: item.order.id,
          orderDate: item.order.createdAt,
          menuName: item.menu.name,
          quantity: item.quantity,
          revenue,
        });
      });
    }
    const summary = { totalRevenue, totalOrders };
    return res.status(200).json({ summary, details });
  } catch (error) {
    console.error("Error fetching revenue by category detail:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
