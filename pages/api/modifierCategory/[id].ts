import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ message: "ID kategori wajib diisi dan harus valid" });
  }

  try {
    switch (req.method) {
      case "PUT":
        const { name, description } = req.body;
        if (!name) {
          return res.status(400).json({ message: "Nama kategori wajib diisi" });
        }
        const updatedCategory = await prisma.modifierCategory.update({
          where: { id: Number(id) },
          data: {
            name,
            description: description || undefined,
          },
        });
        res.status(200).json({ message: "Kategori modifier berhasil diperbarui", category: updatedCategory });
        break;

      case "DELETE":
        await prisma.modifierCategory.delete({
          where: { id: Number(id) },
        });
        res.status(200).json({ message: "Kategori modifier berhasil dihapus" });
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