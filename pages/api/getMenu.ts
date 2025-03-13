// /pages/api/getMenu.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const menus = await prisma.menu.findMany({
        where: {
          // Status: { in: ["Tersedia", "tersedia"] },
          isActive: true,
        },
        include: {
          ingredients: {
            include: {
              ingredient: true,
            },
          },
          discounts: {
            include: {
              discount: true,
            },
            where: {
              discount: {
                isActive: true,
              },
            },
          },
          modifiers: {
            include: {
              modifier: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
      });

      const transformedMenus = menus.map((menu) => ({
        ...menu,
        discounts: menu.discounts.map((md) => ({
          discount: {
            id: md.discount.id,
            name: md.discount.name,
            type: md.discount.type,
            scope: md.discount.scope,
            value: md.discount.value,
            isActive: md.discount.isActive,
          },
        })),
        modifiers: menu.modifiers.map((mm) => ({
          modifier: {
            id: mm.modifier.id,
            name: mm.modifier.name,
            price: mm.modifier.price, // Sertakan harga modifier
            category: {
              id: mm.modifier.category.id,
              name: mm.modifier.category.name,
            },
          },
        })),
      }));

      res.status(200).json(transformedMenus);
    } catch (error) {
      console.error("Error fetching menus:", error);
      res.status(500).json({ message: "Internal server error" });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}