// pages/api/updateSemiFinishedIngredient.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type PayloadUpdate = {
  producedQuantity: number;
  stockMin: number;
  stockIn: number;
  composition: Array<{
    rawIngredientId: number;
    amount: number;
  }>;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", "PUT");
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Ambil id dari req.query
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ message: "Missing ingredient id" });
  }
  const ingredientId = Number(Array.isArray(id) ? id[0] : id);
  if (isNaN(ingredientId)) {
    return res.status(400).json({ message: "Invalid ingredient id" });
  }

  // Destructure field dari body
  const { producedQuantity, stockMin, stockIn, composition } = req.body as PayloadUpdate;

  // Validasi field wajib
  if (producedQuantity === undefined || stockMin === undefined || !Array.isArray(composition) || composition.some((comp) => comp.rawIngredientId === undefined || comp.amount === undefined)) {
    return res.status(400).json({ message: "Missing or invalid required fields: producedQuantity, stockMin, or composition" });
  }

  try {
    // Ambil data ingredient yang ada untuk menghitung stock baru
    const existingIngredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    });

    if (!existingIngredient || existingIngredient.type !== "SEMI_FINISHED") {
      return res.status(404).json({ message: "Semi-finished ingredient not found or invalid type" });
    }

    // Update record ingredient untuk producedQuantity (start) dan stockMin
    const updatedSemiIngredient = await prisma.ingredient.update({
      where: { id: ingredientId },
      data: {
        stockIn: stockIn, // producedQuantity menggantikan nilai start
        stockMin: stockMin, // Update stock minimum
        batchYield: producedQuantity,
        stock: existingIngredient.start + stockIn - existingIngredient.used - existingIngredient.wasted, // Hitung ulang stock
      },
    });

    // Hapus data komposisi lama untuk semi finished ingredient ini
    await prisma.ingredientComposition.deleteMany({
      where: { semiIngredientId: ingredientId },
    });

    // Buat ulang data komposisi baru sesuai payload dan update stock raw ingredient
    for (const comp of composition) {
      // Buat record komposisi baru
      await prisma.ingredientComposition.create({
        data: {
          semiIngredientId: updatedSemiIngredient.id,
          rawIngredientId: comp.rawIngredientId,
          amount: comp.amount,
        },
      });

      // Update raw ingredient:
      // usedBaru = usedLama + comp.amount
      // stock = start + stockIn - used - wasted
      const rawIngredient = await prisma.ingredient.findUnique({
        where: { id: comp.rawIngredientId },
      });
      if (rawIngredient) {
        const newUsed = rawIngredient.used + comp.amount;
        const newStock = rawIngredient.start + rawIngredient.stockIn - newUsed - rawIngredient.wasted;
        await prisma.ingredient.update({
          where: { id: comp.rawIngredientId },
          data: {
            used: newUsed,
            stock: newStock,
          },
        });
      } else {
        console.warn(`Raw ingredient with ID ${comp.rawIngredientId} not found`);
      }
    }

    return res.status(200).json({
      message: "Semi finished ingredient updated successfully",
      semiIngredient: updatedSemiIngredient,
    });
  } catch (error) {
    console.error("Error updating semi finished ingredient:", error);
    return res.status(500).json({ message: "Error updating semi finished ingredient" });
  }
}
