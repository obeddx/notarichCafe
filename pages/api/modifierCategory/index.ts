import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case "GET":
        const categories = await prisma.modifierCategory.findMany({
          include: {
            _count: {
              select: { modifiers: true },
            },
          },
        });
        res.status(200).json({ categories });
        break;

      case "POST":
        const { name, description } = req.body;
        if (!name) {
          return res.status(400).json({ message: "Nama kategori wajib diisi" });
        }
        const newCategory = await prisma.modifierCategory.create({
          data: {
            name,
            description: description || undefined,
          },
        });
        res.status(200).json({ message: "Kategori modifier berhasil dibuat", category: newCategory });
        break;

      default:
        res.status(405).json({ message: "Method not allowed" });
        break;
    }
  } catch (error: any) {
    console.error("Error handling request:", error);
    res.status(500).json({ message: "Internal server error", error: error.message || "Unknown error" });
  } finally {
    await prisma.$disconnect();
  }
}