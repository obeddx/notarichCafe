import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      // --- Ambil data untuk order item yang merupakan menu biasa ---
      const menuItems = await prisma.completedOrderItem.findMany({
        where: { bundleId: null },
        include: {
          menu: {
            select: { category: true, price: true },
          },
        },
      });

      // --- Ambil data untuk order item yang merupakan bundle ---
      const bundleItems = await prisma.completedOrderItem.findMany({
        where: { bundleId: { not: null } },
        include: {
          bundle: {
            select: { id: true, bundlePrice: true },
          },
        },
      });

      // Aggregate revenue dari menuItems (non-bundle)
      const menuRevenueMap: Record<string, number> = {};
      for (const item of menuItems) {
        const category = item.menu.category || "Unknown";
        const revenue = Number(item.menu.price) * item.quantity;
        menuRevenueMap[category] = (menuRevenueMap[category] || 0) + revenue;
      }

      // Aggregate revenue dari bundleItems.
      // Gunakan kategori "Bundle" untuk semua bundle.
      const uniqueBundleOrders = new Map<string, typeof bundleItems[0]>();
      for (const item of bundleItems) {
        const bundle = item.bundle; // narrowing: simpan dalam variabel lokal
        if (!bundle) continue;
        const key = `${item.orderId}-${item.bundleId}`;
        if (!uniqueBundleOrders.has(key)) {
          uniqueBundleOrders.set(key, item);
        }
      }
      const bundleRevenueMap: Record<string, number> = {};
      for (const [_, item] of uniqueBundleOrders.entries()) {
        // item.bundle sudah tidak null karena sudah dicek
        const revenue = Number(item.bundle!.bundlePrice) * item.quantity;
        const category = "Bundle";
        bundleRevenueMap[category] = (bundleRevenueMap[category] || 0) + revenue;
      }

      // Gabungkan revenue dari menu dan bundle
      const mergedData: Record<string, number> = { ...menuRevenueMap };
      for (const [cat, rev] of Object.entries(bundleRevenueMap)) {
        mergedData[cat] = (mergedData[cat] || 0) + rev;
      }

      // Format hasil akhir ke dalam array
      const result = Object.entries(mergedData).map(([category, total]) => ({
        category,
        total,
      }));

      res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching revenue by category:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  } else {
    res.status(405).json({ error: "Method Not Allowed" });
  }
}
