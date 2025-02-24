// /pages/api/getMenu.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      // Ambil semua menu beserta detail ingredient dan discount
      const menus = await prisma.menu.findMany({
        where: {
          Status: { in: ["Tersedia", "tersedia"] },
          isActive: true, // Opsional: Hanya ambil menu yang aktif
        },
        include: {
          ingredients: {
            include: {
              ingredient: true, // Menyertakan detail ingredient
            },
          },
          discounts: {
            include: {
              discount: true, // Menyertakan detail discount
            },
            where: {
              discount: {
                isActive: true, // Hanya ambil discount yang aktif
              },
            },
          },
        },
      });

      // Transformasi data untuk memastikan format sesuai kebutuhan frontend
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
      }));

      res.status(200).json(transformedMenus);
    } catch (error) {
      console.error("Error fetching menus:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}