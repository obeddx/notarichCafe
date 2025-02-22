// pages/api/ingredients/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Ambil semua menu beserta ingredient-nya
    const menus = await prisma.menu.findMany({
      include: {
        ingredients: {
          include: {
            ingredient: true, // Tidak perlu lagi include prices
          }
        }
      }
    });

    // Hitung harga bakul setiap menu dan update ke database
    const updatedMenus = await Promise.all(menus.map(async (menu) => {
      const totalCost = menu.ingredients.reduce((acc, item) => {
        const ingredient = item.ingredient;
        // Harga per unit sudah ada di ingredient.price (misal: per 1 gram atau 1 butir)
        const cost = item.amount * ingredient.price;
        return acc + cost;
      }, 0);

      // Update hargaBakul di database
      await prisma.menu.update({
        where: { id: menu.id },
        data: { hargaBakul: totalCost }
      });

      // Kembalikan objek menu dengan properti hargaBakul yang telah diperbarui
      return {
        ...menu,
        hargaBakul: totalCost
      };
    }));

    res.status(200).json(updatedMenus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    await prisma.$disconnect();
  }
}
