import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Ekstrak data dari request body
  // Pastikan client mengirimkan: name, start, warehouseStart, stockIn, used, wasted, stockMin, unit, unitPrice, price
  const {
    name,
    start,
    warehouseStart,
    stockIn,
    used,
    wasted,
    stockMin,
    unit,
    unitPrice,
    price,
  } = req.body;

  // Validasi sederhana
  if (
    !name ||
    start === undefined ||
    warehouseStart === undefined ||
    stockIn === undefined ||
    used === undefined ||
    wasted === undefined ||
    stockMin === undefined ||
    !unit ||
    !unitPrice ||
    price === undefined
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Hitung stok akhir untuk Ingredient
  const calculatedStock =
    Number(start) + Number(stockIn) - Number(used) - Number(wasted);
  // Hitung stok akhir untuk Gudang menggunakan nilai warehouseStart
  const calculatedGudangStock =
    Number(warehouseStart) + Number(stockIn) - Number(used) - Number(wasted);

  try {
    // Buat record Ingredient baru
    const newIngredient = await prisma.ingredient.create({
      data: {
        name,
        start: Number(start),
        stockIn: Number(stockIn),
        used: Number(used),
        wasted: Number(wasted),
        stock: calculatedStock,
        stockMin: Number(stockMin),
        unit, // Unit utama untuk ingredient
        isActive: true,
      },
    });

    // Buat record Gudang untuk ingredient yang baru dibuat dengan nilai warehouseStart
    const newGudang = await prisma.gudang.create({
      data: {
        ingredientId: newIngredient.id,
        name: newIngredient.name,
        start: Number(warehouseStart),
        stockIn: 0,
        used: 0,
        wasted: 0,
        stock: calculatedGudangStock,
        stockMin: Number(stockMin),
        unit,
        isActive: true,
      },
    });

    // Buat record IngredientPrice dengan unitPrice yang berbeda
    const newIngredientPrice = await prisma.ingredientPrice.create({
      data: {
        ingredientId: newIngredient.id,
        unitPrice: unitPrice, // Menggunakan unitPrice untuk harga (misalnya: "100 gram")
        price: parseFloat(price),
        isActive: true,
      },
    });

    return res.status(200).json({
      message:
        "Ingredient, Gudang, and IngredientPrice created successfully",
      ingredient: newIngredient,
      gudang: newGudang,
      ingredientPrice: newIngredientPrice,
      toast: {
        type: "success",
        color: "green",
        text: "Ingredient berhasil dibuat!",
      },
    });
  } catch (error) {
    console.error("Error creating ingredient:", error);
    return res.status(500).json({ message: "Error creating ingredient" });
  }
}
