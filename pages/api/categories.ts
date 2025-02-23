// pages/api/categories/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Method GET: Ambil daftar kategori
  if (req.method === 'GET') {
    try {
      const categories = await prisma.ingredientCategory.findMany({
        include: {
          _count: {
            select: {
              ingredients: {
                where: { isActive: true },
              },
            },
          },
        },
      });
      return res.status(200).json(
        { 
          categories,
          toast: {
            type: "success",
            color: "green",
            text: "Ingredient berhasil dibuat!",
          },

       }
        
      );
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
  }
  // Method POST: Buat kategori baru
  else if (req.method === 'POST') {
    const { name, description } = req.body;
    
    // Validasi: pastikan field name ada
    if (!name) {
      return res.status(400).json({ error: 'Nama kategori wajib diisi' });
    }
    
    try {
      const newCategory = await prisma.ingredientCategory.create({
        data: {
          name,
          description, // Bisa bernilai undefined jika tidak diisi
        },
      });
      return res.status(201).json({ category: newCategory });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Terjadi kesalahan saat membuat kategori' });
    }
  } 
  // Jika method selain GET atau POST
  else {
    return res.status(405).end();
  }
}
