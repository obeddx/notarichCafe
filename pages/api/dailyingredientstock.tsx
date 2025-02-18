import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { startDate, endDate } = req.query;

  if (!startDate || typeof startDate !== "string") {
    return res.status(400).json({ error: "Query parameter 'startDate' diperlukan." });
  }

  // Parsing startDate
  const parsedStartDate = new Date(startDate);
  parsedStartDate.setHours(0, 0, 0, 0);

  // Jika endDate tidak diberikan, gunakan startDate sebagai endDate
  let parsedEndDate: Date;
  if (!endDate || typeof endDate !== "string") {
    parsedEndDate = new Date(startDate);
    parsedEndDate.setHours(23, 59, 59, 999);
  } else {
    parsedEndDate = new Date(endDate);
    parsedEndDate.setHours(23, 59, 59, 999);
  }

  try {
    const data = await prisma.dailyIngredientStock.findMany({
      where: {
        date: {
          gte: parsedStartDate,
          lte: parsedEndDate,
        },
      },
      include: { ingredient: true },
    });

    res.status(200).json(data);
  } catch (error) {
    console.error("Error retrieving daily ingredient stock:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
