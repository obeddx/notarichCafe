// pages/api/gudang/[id].ts

import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient(); // Pastikan path ini sesuai dengan konfigurasi prisma Anda

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  // Validasi id
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: "ID tidak valid." });
  }

  const gudangId = Number(id);
  if (isNaN(gudangId)) {
    return res.status(400).json({ message: "ID harus berupa angka." });
  }

  switch (req.method) {
    case "PUT":
      try {
        // Ambil data dari body
        const {
          ingredientId,
          name,
          start,
          stockIn,
          used,
          wasted,
          stockMin,
          unit,
          isArchive,
        } = req.body;

        // Pastikan semua nilai numerik dikonversi ke number
        const numStart = Number(start);
        const numStockIn = Number(stockIn);
        const numUsed = Number(used);
        const numWasted = Number(wasted);
        const numStockMin = Number(stockMin);

        // Hitung stock baru menggunakan rumus:
        // newGudangStock = (start + stockIn) - used - wasted
        const newGudangStock = (numStart + numStockIn) - numUsed - numWasted;

        // Update data pada tabel gudang
        const updatedGudang = await prisma.gudang.update({
          where: { id: gudangId },
          data: {
            ingredientId: Number(ingredientId),
            name,
            start: numStart,
            stockIn: numStockIn,
            used: numUsed,
            wasted: numWasted,
            stockMin: numStockMin,
            stock: newGudangStock, // Hasil perhitungan stock baru
            unit,
            isActive: Boolean(isArchive),
          },
        });

        return res.status(200).json({
          message: "Data gudang berhasil diperbarui.",
          gudang: updatedGudang,
        });
      } catch (error: any) {
        console.error("Error updating gudang:", error);
        return res.status(500).json({
          message: "Terjadi kesalahan saat mengupdate data gudang.",
          error: error.message,
        });
      }

    case "DELETE":
      try {
        // Ambil record gudang terlebih dahulu untuk mendapatkan ingredientId
        const gudangRecord = await prisma.gudang.findUnique({
          where: { id: gudangId },
        });
        if (!gudangRecord) {
          return res
            .status(404)
            .json({ message: "Data gudang tidak ditemukan." });
        }

        // Soft delete: ubah flag isActive menjadi false pada gudang
        await prisma.gudang.update({
          where: { id: gudangId },
          data: { isActive: false },
        });

        // Soft delete: ubah flag isActive menjadi false pada ingredient terkait
        await prisma.ingredient.update({
          where: { id: gudangRecord.ingredientId },
          data: { isActive: false },
        });

        return res.status(200).json({
          message: "Data gudang berhasil dihapus (soft delete).",
        });
      } catch (error: any) {
        console.error("Error deleting gudang:", error);
        return res.status(500).json({
         toast: {
                type: "success",
                color: "green",
                text: "Ingredient berhasil dihapus!"
              },
          message: "Terjadi kesalahan saat menghapus data gudang.",
          error: error.message,

        });
      }

    default:
      res.setHeader("Allow", ["PUT", "DELETE"]);
      return res.status(405).json({ message: "Method Not Allowed" });
  }
}
