// File: pages/api/topSellers.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { subDays, startOfWeek, startOfMonth } from "date-fns";

const prisma = new PrismaClient();

// Fungsi helper untuk mendapatkan awal minggu ISO (Senin) dari string ISO week, misal "2023-W12"
function getStartOfISOWeek(isoWeek: string): Date {
  const [yearStr, weekStr] = isoWeek.split("-W");
  const year = Number(yearStr);
  const week = Number(weekStr);
  // Mulai dari 1 Januari tahun tersebut
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay(); // 0 (Minggu) sampai 6 (Sabtu)
  const ISOweekStart = new Date(simple);
  // Sesuaikan agar mendapatkan hari Senin
  if (dow === 0) {
    ISOweekStart.setDate(simple.getDate() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() - dow + 1);
  }
  return ISOweekStart;
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
        // fallback
        startDate = new Date(dateStr);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
      }
    } else if (start && end) {
      // Jika parameter 'date' tidak tersedia, gunakan 'start' dan 'end'
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

    // Ambil data top seller berdasarkan jumlah terjual
    const topSellers = await prisma.completedOrderItem.groupBy({
      by: ["menuId"],
      where: {
        order: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
      take: 5,
    });

    // Ambil nama menu dari masing-masing item
    const menuDetails = await Promise.all(
      topSellers.map(async (item) => {
        const menu = await prisma.menu.findUnique({
          where: { id: item.menuId },
        });
        return {
          menuName: menu?.name || "Unknown",
          totalSold: item._sum.quantity || 0,
        };
      })
    );

    // Hitung total pesanan dan total pendapatan (meskipun tidak akan ditampilkan di UI baru)
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
      topSellers: menuDetails,
      totalOrders,
      totalRevenue,
    });
  } catch (error) {
    console.error("Error fetching top sellers:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
