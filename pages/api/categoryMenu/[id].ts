// pages/api/categoryMenu/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (Array.isArray(id)) {
    return res.status(400).json({ message: "Invalid id parameter" });
  }

  const categoryId = parseInt(id, 10);
  if (isNaN(categoryId)) {
    return res.status(400).json({ message: "Invalid id parameter" });
  }

  if (req.method === "DELETE") {
    try {
      await prisma.categoryMenu.delete({
        where: { id: categoryId },
      });
      return res.status(200).json({ message: "Kategori menu berhasil dihapus" });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Gagal menghapus kategori menu", error });
    }
  } else if (req.method === "PUT") {
    const { kategori } = req.body;
    if (!kategori || typeof kategori !== "string") {
      return res
        .status(400)
        .json({ message: "Kategori harus berupa string dan tidak boleh kosong" });
    }
    try {
      const updatedCategory = await prisma.categoryMenu.update({
        where: { id: categoryId },
        data: { kategori },
      });
      return res.status(200).json({
        message: "Kategori menu berhasil diperbarui",
        category: updatedCategory,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Gagal memperbarui kategori menu", error });
    }
  } else {
    res.setHeader("Allow", ["DELETE", "PUT"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
