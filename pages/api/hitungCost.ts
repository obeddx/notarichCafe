import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Ambil semua menu beserta ingredient, diskon aktif, dan modifier
    const menus = await prisma.menu.findMany({

      where: {
        type: "NORMAL", // Filter hanya menu dengan type NORMAL
      },
      include: {
        ingredients: {
          include: {
            ingredient: true, // Detail ingredient (termasuk batchYield, price, dan type)
          },
        },
        discounts: {
          include: {
            discount: true, // Detail diskon
          },
          where: {
            discount: {
              isActive: true, // Hanya ambil diskon yang aktif
            },
          },
        },
        modifiers: {
          include: {
            modifier: true, // Detail modifier
          },
        }, // Tambahkan relasi modifiers
      },
    });

    // Hitung hargaBakul setiap menu dan update ke database
    const updatedMenus = await Promise.all(
      menus.map(async (menu) => {
        const totalCost = menu.ingredients.reduce((acc, item) => {
          const ingredient = item.ingredient;
          const amount = Number(item.amount) || 0;
          const price = Number(ingredient.price) || 0;
          const batchYield = Number(ingredient.batchYield) || 0;
          let cost = 0;

          if (ingredient.type.toUpperCase() === "SEMI_FINISHED" && batchYield > 0) {
            cost = (amount / batchYield) * price;
          } else {
            cost = amount * price;
          }
          return acc + cost;
        }, 0);

        // Update hargaBakul untuk menu ini
        await prisma.menu.update({
          where: { id: menu.id },
          data: { hargaBakul: totalCost },
        });

        // Transformasi data diskon agar sesuai dengan format yang diinginkan frontend
        const transformedDiscounts = menu.discounts.map((md) => ({
          discount: {
            id: md.discount.id,
            name: md.discount.name,
            type: md.discount.type,
            scope: md.discount.scope,
            value: md.discount.value,
            isActive: md.discount.isActive,
          },
        }));

        return {
          ...menu,
          hargaBakul: totalCost,
          discounts: transformedDiscounts,
          modifiers: menu.modifiers, // Sertakan data modifiers
        };
      })
    );

    res.status(200).json(updatedMenus);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Server error" });
  } finally {
    await prisma.$disconnect();
  }
}