// pages/api/grossMarginDetail.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const { date, period } = req.query;
    if (!date) {
      return res.status(400).json({ error: "Date is required" });
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
      startDate = new Date(date as string);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    }

    try {
      const summaryRaw: any[] = await prisma.$queryRaw`
        SELECT 
          SUM(co.finalTotal) as netSales,
          SUM(m.hargaBakul * ci.quantity) as totalHPP
        FROM CompletedOrder co
        JOIN CompletedOrderItem ci ON co.id = ci.orderId
        JOIN Menu m ON ci.menuId = m.id
        WHERE co.createdAt >= ${startDate} AND co.createdAt < ${endDate}
      `;

      const summary = summaryRaw && summaryRaw.length > 0
        ? {
            netSales: Number(summaryRaw[0].netSales) || 0,
            totalHPP: Number(summaryRaw[0].totalHPP) || 0,
            grossMargin:
              Number(summaryRaw[0].netSales) > 0
                ? ((Number(summaryRaw[0].netSales) - Number(summaryRaw[0].totalHPP)) /
                    Number(summaryRaw[0].netSales)) * 100
                : 0,
          }
        : { netSales: 0, totalHPP: 0, grossMargin: 0 };

      const details: any[] = await prisma.$queryRaw`
        SELECT 
          m.name as menuName,
          m.price as sellingPrice,
          m.hargaBakul as hpp,
          SUM(ci.quantity) as quantity,
          SUM(m.price * ci.quantity) as totalSales
        FROM CompletedOrder co
        JOIN CompletedOrderItem ci ON co.id = ci.orderId
        JOIN Menu m ON ci.menuId = m.id
        WHERE co.createdAt >= ${startDate} AND co.createdAt < ${endDate}
        GROUP BY m.id
      `;

      return res.status(200).json({
        summary,
        details,
      });
    } catch (error) {
      console.error("Error fetching gross margin detail:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
  return res.status(405).json({ error: "Method not allowed" });
}