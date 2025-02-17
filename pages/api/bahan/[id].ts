// /pages/api/ingredients/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const ingredientId = Number(id);

  if (isNaN(ingredientId)) {
    return res.status(400).json({ message: "Invalid ingredient id" });
  }

  if (req.method === "PUT") {
    const { name, start, stockIn, used, wasted, stockMin, unit, isActive } = req.body;

    try {
      // Ambil data ingredient saat ini
      const ingredient = await prisma.ingredient.findUnique({
        where: { id: ingredientId },
      });

      if (!ingredient) {
        return res.status(404).json({ message: "Ingredient not found" });
      }

      // Tentukan nilai baru, jika field dikirim dalam body gunakan nilai baru, jika tidak gunakan nilai lama
      const newStart = start !== undefined ? Number(start) : ingredient.start;
      const newStockIn = stockIn !== undefined ? Number(stockIn) : ingredient.stockIn;
      const newUsed = used !== undefined ? Number(used) : ingredient.used;
      const newWasted = wasted !== undefined ? Number(wasted) : ingredient.wasted;

      // Hitung ulang stockakhir untuk ingredient
      const newIngredientStock = (newStart + newStockIn) - newUsed - newWasted;

      // Update data ingredient
      const updatedIngredient = await prisma.ingredient.update({
        where: { id: ingredientId },
        data: {
          name,
          start: start !== undefined ? newStart : undefined,
          stockIn: stockIn !== undefined ? newStockIn : undefined,
          used: used !== undefined ? newUsed : undefined,
          wasted: wasted !== undefined ? newWasted : undefined,
          stockMin: stockMin !== undefined ? Number(stockMin) : undefined,
          unit,
          ...(isActive !== undefined && { isActive }),
          stock: newIngredientStock,
        },
      });

      // Jika ada perubahan pada stockIn, lakukan update pada tabel gudang
      let updatedGudang = null;
      if (stockIn !== undefined) {
        // Ambil data gudang yang terkait (asumsi: id gudang sama dengan ingredientId)
        const gudang = await prisma.gudang.findUnique({
          where: { id: ingredientId },
        });

        if (gudang) {
           // Hitung perubahan (increment) pada stockIn
    const increment = newStockIn - ingredient.stockIn;
    // Tambahkan increment tersebut ke gudang.used
    const newGudangUsed = gudang.used + increment;
    // Hitung ulang stock akhir untuk gudang:
    const newGudangStock = (gudang.start + gudang.stockIn) - newGudangUsed - gudang.wasted;

          updatedGudang = await prisma.gudang.update({
            where: { id: ingredientId },
            data: {
              used: newGudangUsed,
              stock: newGudangStock,
            },
          });
        }
      }

       // Variabel untuk menyimpan pesan notifikasi
       let notificationMessage = "";

       // Cek kondisi:
      // 1. Jika stock akhir sama dengan stockMin dan tidak nol:
      if (newIngredientStock <= updatedIngredient.stockMin && newIngredientStock !== 0) {
        notificationMessage = `manager harus melakukan stock in, stock ${ingredient.name} di cafe sudah mencapai batas minimal`;
      }

       // 2. Jika stock akhir sama dengan 0:
       else if (newIngredientStock === 0) {
        // Cari semua Menu yang memiliki ingredient tersebut
        const menusToUpdate = await prisma.menu.findMany({
          where: {
            ingredients: {
              some: { ingredientId: ingredientId },
            },
          },
        });

        // Perbarui field 'status' di tiap Menu yang ditemukan menjadi "Habis"
        for (const menu of menusToUpdate) {
          await prisma.menu.update({
            where: { id: menu.id },
            data: { Status: "Habis" },
          });
        }
        notificationMessage = `stock ${ingredient.name} di cafe sudah habis`;
      }

      // Jika stock akhir lebih besar dari stockMin, periksa apakah ada menu yang statusnya "Habis"
      // dan update statusnya menjadi "Tersedia"
      else if (newIngredientStock > updatedIngredient.stockMin) {
        const menusToUpdate = await prisma.menu.findMany({
          where: {
            ingredients: {
              some: { ingredientId: ingredientId },
            },
            Status: "Habis",
          },
        });

        for (const menu of menusToUpdate) {
          await prisma.menu.update({
            where: { id: menu.id },
            data: { Status: "Tersedia" },
          });
        }
      }

      return res.status(200).json({
        message: "Ingredient berhasil diupdate",
        ingredient: updatedIngredient,
        notificationMessage,
        gudang: updatedGudang,
        toast: {
            type: "success",
            color: "green",
            text: "Ingredient berhasil dibuat!"
          }
      });
    } catch (error) {
      console.error("Error updating ingredient:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  } else if (req.method === "DELETE") {
    // Contoh metode DELETE untuk soft delete (update isActive menjadi false)
    try {
      const updatedIngredient = await prisma.ingredient.update({
        where: { id: ingredientId },
        data: { isActive: false },
      });
      const updatedGudang = await prisma.gudang.updateMany({
        where: { ingredientId: ingredientId },
        data: { isActive: false },
      });
      
      return res.status(200).json({
        message: "Ingredient berhasil dihapus (soft delete)",
        ingredient: updatedIngredient,
        gudang: updatedGudang,
      });
    } catch (error) {
      console.error("Error deleting ingredient:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  } else {
    return res.status(405).json({ message: "Method not allowed" });
  }
}
