// pages/api/updateSemiFinishedIngredient.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type PayloadUpdate = {
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

  // Destructure field lainnya dari body
  const {
    name,
    categoryId,
    finishedUnit,
    producedQuantity,
    type,
    price,
    composition,
  } = req.body as PayloadUpdate;

  // Validasi field wajib
  if (
    !name ||
    !categoryId ||
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
    // Update record ingredient dengan tipe SEMI_FINISHED.
    // Misalnya, untuk semi finished, kita set nilai awal stock = producedQuantity.
    console.log(req.body);
    const updatedSemiIngredient = await prisma.ingredient.update({
      where: { id: ingredientId },
      data: {
        name,
        categoryId,
        finishedUnit,
        type, // Harus "SEMI_FINISHED"
        price,
        start: producedQuantity,
        stockIn: 0,
        used: 0,
        wasted: 0,
        stock: producedQuantity, // Stock awal sama dengan producedQuantity
        stockMin: 0, // Bisa disesuaikan jika diperlukan
        // Untuk semi finished, kita gunakan finishedUnit sebagai unit
        unit: finishedUnit,
        batchYield: producedQuantity,
        isActive: true,
      },
    });

    // Hapus data komposisi lama untuk semi finished ingredient ini
    await prisma.ingredientComposition.deleteMany({
      where: { semiIngredientId: ingredientId },
    });

    // Buat ulang data komposisi baru sesuai payload
    for (const comp of composition) {
      if (!comp.rawIngredientId || comp.amount === undefined) continue;
      
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
        const newStock =
          rawIngredient.start +
          rawIngredient.stockIn -
          newUsed -
          rawIngredient.wasted;
        await prisma.ingredient.update({
          where: { id: comp.rawIngredientId },
          data: {
            used: newUsed,
            stock: newStock,
          },
        });
      }
    }

    return res.status(200).json({
      message: "Semi finished ingredient updated successfully",
      semiIngredient: updatedSemiIngredient,
    });
  } catch (error) {
    console.error("Error updating semi finished ingredient:", error);
    return res
      .status(500)
      .json({ message: "Error updating semi finished ingredient" });
  }
}
