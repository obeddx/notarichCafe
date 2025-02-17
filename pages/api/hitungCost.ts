import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Ambil semua menu beserta ingredient-nya dan harga bahan (IngredientPrice)
    const menus = await prisma.menu.findMany({
      include: {
        ingredients: {
          include: {
            ingredient: {
              include: {
                prices: true, // Ambil data harga dari IngredientPrice
              }
            }
          }
        }
      }
    });

    // Hitung harga bakul setiap menu dan update ke database
    const updatedMenus = await Promise.all(menus.map(async (menu) => {
      const totalCost = menu.ingredients.reduce((acc, item) => {
        const ingredient = item.ingredient;
        // Cari harga aktif untuk ingredient tersebut
        const ingredientPrice = ingredient.prices.find(p => p.isActive);
        if (!ingredientPrice) return acc;

        // Ambil angka dari unitPrice, misalnya "100 gram" → 100
        const unitValue = parseFloat(ingredientPrice.unitPrice.split(" ")[0]);
        if (isNaN(unitValue) || unitValue <= 0) return acc;

        // Harga per unit (sesuai unitPrice)
        const pricePerUnit = ingredientPrice.price / unitValue;
        // Hitung biaya untuk bahan ini berdasarkan jumlah (item.amount)
        const cost = item.amount * pricePerUnit;
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

    // Kembalikan array menu yang telah diperbarui ke frontend
    res.status(200).json(updatedMenus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    await prisma.$disconnect();
  }
}
