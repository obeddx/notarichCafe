// pages/api/dailyingredientstock.tsx

import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { date } = req.query;

  if (!date || typeof date !== "string") {
    return res
      .status(400)
      .json({ error: "Query parameter 'date' diperlukan." });
  }

  // Parsing tanggal dari query string menjadi Date object
  const parsedDate = new Date(date);

  // Menentukan awal dan akhir hari (rentang waktu hari tersebut)
  const startOfDay = new Date(parsedDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(parsedDate);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    // Mengambil data berdasarkan rentang waktu pada field DateTime
    // dan menyertakan data ingredient agar bisa menampilkan ingredient name
    const data = await prisma.dailyIngredientStock.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
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
