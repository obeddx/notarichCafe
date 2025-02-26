// pages/api/getMenuOne.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: "ID is required" });
  }

  try {
    const menu = await prisma.menu.findUnique({
      where: { id: parseInt(id as string) },
      include: {
        ingredients: true,
        modifiers: { include: { modifier: true } },
        discounts: true,
      },
    });

    if (!menu) {
      return res.status(404).json({ message: "Menu not found" });
    }

    return res.status(200).json({ menu });
  } catch (error) {
    console.error("Error fetching menu:", error);
    return res.status(500).json({ message: "Failed to fetch menu" });
  } finally {
    await prisma.$disconnect();
  }
}