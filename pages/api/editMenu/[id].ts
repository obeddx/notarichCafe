// /pages/api/editMenu/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { IncomingMessage, ServerResponse } from "http";

const prisma = new PrismaClient();

// Pastikan folder uploads tersedia
const uploadDir = path.join(process.cwd(), "public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi multer untuk penyimpanan file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/uploads");
  },
  filename: (req, file, cb) => {
    const ext = file.originalname.split(".").pop();
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    cb(null, filename);
  },
});

const upload = multer({ storage });

// Extend NextApiRequest agar bisa menampung file dari multer
interface NextApiRequestWithFile extends NextApiRequest {
  file?: Express.Multer.File;
}

// Middleware multer sebagai fungsi Promise
const runMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  fn: Function
) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
};

export default async function handler(
  req: NextApiRequestWithFile,
  res: NextApiResponse
) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Ambil id menu dari parameter URL
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ message: "Menu ID diperlukan" });
  }
  const menuId = parseInt(id as string);

  try {
    // Jalankan middleware multer untuk menangani file upload
    await runMiddleware(req, res, upload.single("image"));

    // Ambil data yang dikirim melalui form-data
    const { name, description, price, Status, category, ingredients } = req.body;
    if (!name || !price) {
      return res.status(400).json({ message: "Name dan Price wajib diisi" });
    }

    const menuPrice = parseFloat(price);
    let parsedIngredients = [];
    if (ingredients) {
      try {
        parsedIngredients = JSON.parse(ingredients);
      } catch (error) {
        console.error("Error parsing ingredients:", error);
        return res.status(400).json({ message: "Invalid ingredients format" });
      }
    }

    // Bangun objek data untuk update menu
    let updateData: any = {
      name,
      description: description || null,
      price: menuPrice,
      Status,
      category,
    };

    // Jika ada file gambar baru, update field image
    if (req.file) {
      const imagePath = `/uploads/${req.file.filename}`;
      updateData.image = imagePath;
    }

    // Update menu di database
    const updatedMenu = await prisma.menu.update({
      where: { id: menuId },
      data: updateData,
    });

    // Jika terdapat data ingredients, lakukan update:
    // Untuk kesederhanaan, kita hapus data ingredients lama dan buat yang baru.
    if (parsedIngredients.length > 0) {
      await prisma.menuIngredient.deleteMany({
        where: { menuId },
      });

      const menuIngredientsData = parsedIngredients.map((ing: any) => ({
        menuId,
        ingredientId: ing.ingredientId,
        amount: ing.amount,
      }));

      await prisma.menuIngredient.createMany({
        data: menuIngredientsData,
      });
    }

    return res
      .status(200)
      .json({ message: "Menu berhasil diupdate", menu: updatedMenu });
  } catch (error: any) {
    console.error("Error updating menu:", error);
    return res.status(500).json({ message: "Gagal mengupdate menu" });
  }
}

// Nonaktifkan bodyParser agar multer dapat menangani form-data
export const config = {
  api: {
    bodyParser: false,
  },
};
