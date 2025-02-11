// /pages/api/menus.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      // Ambil semua menu beserta detail ingredient (melalui tabel join)
      const menus = await prisma.menu.findMany({
        include: {
          ingredients: {
            include: {
              ingredient: true, // menyertakan detail ingredient
            },
          },
        },
      });
      res.status(200).json(menus);
    } catch (error) {
      console.error("Error fetching menus:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
