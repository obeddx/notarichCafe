// pages/api/ingredients/[id].ts
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
    // Destructure field yang dikirimkan client
    const { 
      name, 
      start, 
      stockIn, 
      used, 
      wasted, 
      stockMin, 
      unit, 
      isActive,
      price,
      categoryId,
      type
    } = req.body;

    try {
      // Ambil data ingredient saat ini
      const ingredient = await prisma.ingredient.findUnique({
        where: { id: ingredientId }
      });

      if (!ingredient) {
        return res.status(404).json({ message: "Ingredient not found" });
      }

      // Tentukan nilai baru berdasarkan data yang dikirim atau gunakan nilai lama
      const newStart = start !== undefined ? Number(start) : ingredient.start;
      const newStockIn = stockIn !== undefined ? Number(stockIn) : ingredient.stockIn;
      const newUsed = used !== undefined ? Number(used) : ingredient.used;
      const newWasted = wasted !== undefined ? Number(wasted) : ingredient.wasted;

      // Hitung ulang stock akhir untuk ingredient
      const newIngredientStock = (newStart + newStockIn) - newUsed - newWasted;

      // Update data ingredient (tanpa nested update untuk prices, karena harga langsung ada di model Ingredient)
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
          price: price !== undefined ? Number(price) : ingredient.price,
          categoryId: categoryId !== undefined ? categoryId : undefined,
          type: type !== undefined ? type : undefined,
          finishedUnit: "-",
        },
        
      });

      // Jika ada perubahan pada stockIn, lakukan update pada tabel gudang
      let updatedGudang = null;
      if (stockIn !== undefined) {
        const gudang = await prisma.gudang.findUnique({
          where: { id: ingredientId },
        });

        if (gudang) {
          const increment = newStockIn - ingredient.stockIn;
          const newGudangUsed = gudang.used + increment;
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

      // Logika tambahan (update menu status dan perhitungan maxBeli) tetap sama...
      let notificationMessage = "";
      if (newIngredientStock <= updatedIngredient.stockMin && newIngredientStock !== 0) {
        notificationMessage = `Manager harus melakukan stock in, stock ${ingredient.name} di cafe sudah mencapai batas minimal`;
      } else if (newIngredientStock === 0) {
        const menusToUpdate = await prisma.menu.findMany({
          where: {
            ingredients: {
              some: { ingredientId: ingredientId },
            },
          },
        });
        for (const menu of menusToUpdate) {
          await prisma.menu.update({
            where: { id: menu.id },
            data: { Status: "Habis" },
          });
        }
        
      } else if (newIngredientStock > updatedIngredient.stockMin) {
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

      // Logika perhitungan maxBeli tetap sama...
      const menusUsingIngredient = await prisma.menu.findMany({
        where: {
          ingredients: {
            some: { ingredientId: ingredientId },
          },
        },
        include: {
          ingredients: {
            include: { ingredient: true },
          },
        },
      });

      for (const menu of menusUsingIngredient) {
        let newMaxBeli = Infinity;
        for (const menuIngredient of menu.ingredients) {
          if (menuIngredient.amount > 0) {
            const ingredientStock = menuIngredient.ingredient.stock;
            const possible = Math.floor(ingredientStock / menuIngredient.amount);
            newMaxBeli = Math.min(newMaxBeli, possible);
          }
        }
        if (newMaxBeli === Infinity) {
          newMaxBeli = 0;
        }
        await prisma.menu.update({
          where: { id: menu.id },
          data: { maxBeli: newMaxBeli },
        });
      }

      return res.status(200).json({
        message: "Ingredient berhasil diupdate",
        ingredient: updatedIngredient,
        notificationMessage,
        gudang: updatedGudang,
      });
    } catch (error) {
      console.error("Error updating ingredient:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  } else if (req.method === "DELETE") {
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
