// pages/api/bahanRaw.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Query ingredients dengan type "RAW"
    const rawIngredients = await prisma.ingredient.findMany({
      where: {
        type: "RAW",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        price: true,
        unit: true,
      },
    });
    return res.status(200).json(rawIngredients);
  } catch (error) {
    console.error("Error fetching raw ingredients:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
