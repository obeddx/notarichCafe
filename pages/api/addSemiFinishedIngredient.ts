// pages/api/addSemiFinishedIngredient.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Payload = {
  name: string;
  categoryId: number; // Menggunakan categoryId sebagai number
  finishedUnit: string;
  producedQuantity: number;
  type: "SEMI_FINISHED";
  price: number;
  composition: Array<{
    rawIngredientId: number;
    amount: number;
  }>;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const {
    name,
    categoryId, // Mengambil categoryId dari body
    finishedUnit,
    producedQuantity,
    type,
    price,
    composition,
  } = req.body as Payload;

  // Validasi field wajib
  if (
    !name ||
    !categoryId || // Validasi categoryId
    !finishedUnit ||
    producedQuantity === undefined ||
    !type ||
    price === undefined ||
    !composition ||
    !Array.isArray(composition)
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // Buat record ingredient baru dengan tipe SEMI_FINISHED
    const newSemiIngredient = await prisma.ingredient.create({
      data: {
        name,
        categoryId, // Menggunakan categoryId
        finishedUnit,
        type, // Harus "SEMI_FINISHED"
        price,
        start: producedQuantity,
        stockIn: 0,
        used: 0,
        wasted: 0,
        stock: producedQuantity, // Stock awal sama dengan producedQuantity
        stockMin: 0, // Bisa disesuaikan jika diperlukan
        unit: finishedUnit,
        isActive: true,
      },
    });

    // Buat record di IngredientComposition untuk setiap baris komposisi
    for (const comp of composition) {
      // Pastikan rawIngredientId dan amount valid
      if (!comp.rawIngredientId || comp.amount === undefined) continue;
      await prisma.ingredientComposition.create({
        data: {
          semiIngredientId: newSemiIngredient.id,
          rawIngredientId: comp.rawIngredientId,
          amount: comp.amount,
        },
      });
    }

    return res.status(200).json({
      message: "Semi finished ingredient created successfully",
      semiIngredient: newSemiIngredient,
    });
  } catch (error) {
    console.error("Error creating semi finished ingredient:", error);
    return res.status(500).json({ message: "Error creating semi finished ingredient" });
  }
}