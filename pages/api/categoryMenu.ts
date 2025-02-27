// pages/api/categoryMenu/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const categories = await prisma.categoryMenu.findMany();
      return res.status(200).json({ categories });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Gagal mengambil data kategori menu", error });
    }
  } else if (req.method === "POST") {
    const { kategori } = req.body;
    if (!kategori || typeof kategori !== "string") {
      return res
        .status(400)
        .json({ message: "Kategori harus berupa string dan tidak boleh kosong" });
    }
    try {
      const newCategory = await prisma.categoryMenu.create({
        data: { kategori },
      });
      return res
        .status(201)
        .json({ message: "Kategori menu berhasil dibuat", category: newCategory });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Gagal membuat kategori menu", error });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
