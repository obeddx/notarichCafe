// pages/api/ingredientComposition.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { semiIngredientId } = req.query;
  if (!semiIngredientId) {
    return res.status(400).json({ message: "Missing semiIngredientId" });
  }

  // Pastikan semiIngredientId adalah string (jika ada kemungkinan array, ambil elemen pertama)
  const semiId = Array.isArray(semiIngredientId) ? semiIngredientId[0] : semiIngredientId;

  try {
    // Ambil data komposisi berdasarkan semiIngredientId
    const compositions = await prisma.ingredientComposition.findMany({
      where: { semiIngredientId: Number(semiId) },
    });
    return res.status(200).json(compositions);
  } catch (error) {
    console.error("Error fetching ingredient composition:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
