import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const categorySales = await prisma.menu.groupBy({
      by: ["category"],
      _sum: { price: true },
    });

    res.status(200).json({
      topCategories: categorySales.map((item) => ({
        category: item.category,
        revenue: item._sum.price,
      })),
    });
  } catch (error) {
    console.error("❌ Error fetching category stats:", error);
    res.status(500).json({ message: "Gagal mengambil data kategori." });
  }
}
