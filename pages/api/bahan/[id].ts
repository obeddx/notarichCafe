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
    // Destructure field tambahan price dan unitPriceQuantity
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
      unitPriceQuantity 
    } = req.body;

    try {
      // Ambil data ingredient saat ini beserta data harga terkait
      const ingredient = await prisma.ingredient.findUnique({
        where: { id: ingredientId },
        include: { prices: true }
      });

      if (!ingredient) {
        return res.status(404).json({ message: "Ingredient not found" });
      }

      // Tentukan nilai baru, jika field dikirim dalam body gunakan nilai baru, jika tidak gunakan nilai lama
      const newStart = start !== undefined ? Number(start) : ingredient.start;
      const newStockIn = stockIn !== undefined ? Number(stockIn) : ingredient.stockIn;
      const newUsed = used !== undefined ? Number(used) : ingredient.used;
      const newWasted = wasted !== undefined ? Number(wasted) : ingredient.wasted;

      // Hitung ulang stock akhir untuk ingredient
      const newIngredientStock = (newStart + newStockIn) - newUsed - newWasted;

      // Update data ingredient beserta nested update untuk ingredientPrice.
      // Untuk field unitPrice, gabungkan nilai numeric dan unit secara otomatis,
      // misalnya "1 butir" jika unitPriceQuantity=1 dan unit="butir".
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
          // Nested update pada tabel ingredientPrice
          ...((price !== undefined || unitPriceQuantity !== undefined) && {
            prices: {
              updateMany: {
                // Update semua record harga yang terkait (asumsi hanya ada 1 record)
                where: {},
                data: {
                  ...(price !== undefined ? { price: Number(price) } : {}),
                  ...(unitPriceQuantity !== undefined
                    ? { unitPrice: `${unitPriceQuantity} ${unit}` }
                    : {})
                }
              }
            }
          })
        },
        include: { prices: true }
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
      if (newIngredientStock <= updatedIngredient.stockMin && newIngredientStock !== 0) {
        notificationMessage = `manager harus melakukan stock in, stock ${ingredient.name} di cafe sudah mencapai batas minimal`;
      } else if (newIngredientStock === 0) {
        // Cari dan update menu yang terkait menjadi "Habis"
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
        notificationMessage = `stock ${ingredient.name} di cafe sudah habis`;
      } else if (newIngredientStock > updatedIngredient.stockMin) {
        // Update menu yang statusnya "Habis" menjadi "Tersedia"
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
