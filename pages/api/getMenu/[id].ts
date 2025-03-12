// /pages/api/menus/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Ambil id dari parameter URL
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ message: "ID diperlukan" });
  }

  const menuId = Number(id);

  if (req.method === "GET") {
    try {
      const menu = await prisma.menu.findUnique({
        where: { id: menuId },
        include: {
          ingredients: {
            include: {
              ingredient: true,
            },
          },
        },
      });

      if (!menu) {
        return res.status(404).json({ message: "Menu tidak ditemukan" });
      }

      return res.status(200).json(menu);
    } catch (error) {
      console.error("Error fetching menu:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  } else if (req.method === "DELETE") {
    try {
      // Hapus semua data menuIngredient yang memiliki menuId sesuai
      await prisma.menuIngredient.deleteMany({
        where: { menuId },
      });

      await prisma.menuModifier.deleteMany({
        where: { menuId },
      });
      await prisma.menuDiscount.deleteMany({
        where: { menuId },
      });

      await prisma.menuComposition.deleteMany({
        where: { menuId },
      });

      // Hapus data menu
      const deletedMenu = await prisma.menu.delete({
        where: { id: menuId },
      });

      return res.status(200).json({
        message: "Menu dan data menu ingredient berhasil dihapus",
        menu: deletedMenu,
      });
    } catch (error) {
      console.error("Error deleting menu:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  } else if (req.method === "PATCH") {
    try {
      // Ambil data dari body request
      const { Status } = req.body;

      // Validasi input
      if (!Status || !["Tersedia", "Habis"].includes(Status)) {
        return res.status(400).json({
          message: 'Status diperlukan dan harus "Tersedia" atau "Habis"',
        });
      }

      // Update status menu di database
      const updatedMenu = await prisma.menu.update({
        where: { id: menuId },
        data: {
          Status: Status, // Pastikan field ini sesuai dengan schema Prisma Anda
        },
      });

      return res.status(200).json({
        message: "Status menu berhasil diperbarui",
        menu: updatedMenu,
      });
    } catch (error) {
      console.error("Error updating menu status:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  } else {
    return res.status(405).json({ message: "Method not allowed" });
  }
}