import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    // Ambil semua bahan dengan tipe SEMI_FINISHED beserta komposisi-nya
    const semiIngredients = await prisma.ingredient.findMany({
      where: { type: "SEMI_FINISHED" },
      include: {
        semiCompositions: {
          include: {
            rawIngredient: true, // sertakan detail raw ingredient
          },
        },
      },
    });

    // Mapping data agar sesuai dengan struktur yang diharapkan di client
    const result = semiIngredients.map((semi) => ({
      id: semi.id,
      name: semi.name,
      compositions: semi.semiCompositions.map((comp) => ({
        rawIngredient: comp.rawIngredient,
        amount: comp.amount,
      })),
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching semi finished ingredients:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
