import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { startDate, endDate } = req.query;

  // Memeriksa apakah startDate dan endDate ada dan dalam format yang benar
  if (!startDate || !endDate || typeof startDate !== "string" || typeof endDate !== "string") {
    return res.status(400).json({ error: "Query parameter 'startDate' dan 'endDate' diperlukan." });
  }

  // Parsing startDate dan endDate menjadi objek Date
  const parsedStartDate = new Date(startDate);
  parsedStartDate.setHours(0, 0, 0, 0); // Menentukan waktu mulai dari jam 00:00:00

  const parsedEndDate = new Date(endDate);
  parsedEndDate.setHours(23, 59, 59, 999); // Menentukan waktu akhir pada jam 23:59:59

  try {
    // Mengambil data berdasarkan rentang waktu yang diberikan oleh startDate dan endDate
    const data = await prisma.dailyIngredientStock.findMany({
      where: {
        date: {
          gte: parsedStartDate, // Greater than or equal to startDate
          lte: parsedEndDate, // Less than or equal to endDate
        },
      },
      include: { ingredient: true }, // Menyertakan data ingredient agar bisa ditampilkan
    });

    res.status(200).json(data);
  } catch (error) {
    console.error("Error retrieving daily ingredient stock:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
