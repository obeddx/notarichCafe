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
const runMiddleware = (req: IncomingMessage, res: ServerResponse, fn: Function) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
};

// Handler API manual tanpa next-connect
export default async function handler(req: NextApiRequestWithFile, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Jalankan middleware multer untuk menangani upload
    await runMiddleware(req, res, upload.single("image"));

    const { name, description, price, ingredients } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : "";

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

    // Simpan ke database menggunakan Prisma
    const newMenu = await prisma.menu.create({
      data: {
        name,
        description: description || null,
        price: menuPrice,
        image: imagePath,
      },
    });

    if (parsedIngredients.length > 0) {
      const menuIngredientsData = parsedIngredients.map((ing: any) => ({
        menuId: newMenu.id,
        ingredientId: ing.ingredientId,
        amount: ing.amount,
      }));

      await prisma.menuIngredient.createMany({
        data: menuIngredientsData,
      });
    }

    return res.status(200).json({ message: "Menu berhasil dibuat", menu: newMenu });
  } catch (error: any) {
    console.error("Error creating menu:", error);
    return res.status(500).json({ message: "Gagal membuat menu" });
  }
}

// Nonaktifkan bodyParser agar multer dapat menangani form-data
export const config = {
  api: {
    bodyParser: false,
  },
};
