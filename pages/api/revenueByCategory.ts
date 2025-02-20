import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      // Ambil jumlah total per menuId dan hitung total harga
      const revenueByMenu = await prisma.completedOrderItem.groupBy({
        by: ["menuId"],
        _sum: {
          quantity: true,
        },
      });

      // Dapatkan kategori dan harga dari tabel Menu berdasarkan menuId
      const formattedData = await Promise.all(
        revenueByMenu.map(async (item) => {
          const menu = await prisma.menu.findUnique({
            where: { id: item.menuId },
            select: { category: true, price: true },
          });

          const totalRevenue = (item._sum.quantity || 0) * (menu?.price || 0);

          return {
            category: menu?.category || "Unknown",
            total: totalRevenue,
          };
        })
      );

      // Gabungkan data dengan kategori yang sama
      const mergedData: Record<string, number> = {};
      formattedData.forEach((item) => {
        if (mergedData[item.category]) {
          mergedData[item.category] += item.total;
        } else {
          mergedData[item.category] = item.total;
        }
      });

      // Format ulang hasil akhir
      const result = Object.keys(mergedData).map((category) => ({
        category,
        total: mergedData[category],
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