// pages/api/categories/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Ambil parameter id dari query string
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Parameter id tidak valid' });
  }
  
  const categoryId = parseInt(id, 10);
  if (isNaN(categoryId)) {
    return res.status(400).json({ error: 'Parameter id harus berupa angka' });
  }

  // Handle DELETE: hapus kategori
  if (req.method === 'DELETE') {
    try {
      const deletedCategory = await prisma.ingredientCategory.delete({
        where: { id: categoryId },
      });
      return res.status(200).json({ category: deletedCategory });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Gagal menghapus kategori' });
    }
  }
  // Handle PUT: update/edit kategori
  else if (req.method === 'PUT') {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Nama kategori wajib diisi' });
    }
    try {
      const updatedCategory = await prisma.ingredientCategory.update({
        where: { id: categoryId },
        data: {
          name,
          description, // description bisa undefined atau null jika tidak diisi
        },
      });
      return res.status(200).json(
        {
            success: true,
            message: "Ingredient berhasil dibuat!",
            category: updatedCategory,
        }
    );
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Gagal mengupdate kategori' });
    }
  }
  // Method lain tidak diizinkan
  else {
    return res.status(405).end();
  }
}
