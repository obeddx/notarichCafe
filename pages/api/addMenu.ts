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
  destination: (_req, _file, cb) => {
    cb(null, "./public/uploads");
  },
  filename: (_req, file, cb) => {
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
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Jalankan middleware multer untuk menangani upload
    await runMiddleware(req, res, upload.single("image"));

    const {
      name,
      description,
      price,
      ingredients,
      category,
      Status,
      discountId, // Field tambahan untuk diskon
    } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : "";

    if (!name || !price) {
      return res.status(400).json({ message: "Name dan Price wajib diisi" });
    }

    const menuPrice = parseFloat(price);
    let parsedIngredients: any[] = [];

    if (ingredients) {
      try {
        parsedIngredients = JSON.parse(ingredients);
      } catch (error) {
        console.error("Error parsing ingredients:", error);
        return res.status(400).json({ message: "Invalid ingredients format" });
      }
    }

    // Simpan menu baru ke database
    const newMenu = await prisma.menu.create({
      data: {
        name,
        description: description || null,
        price: menuPrice,
        image: imagePath,
        hargaBakul: 2000,
        category,
        Status,
      },
    });

    // Jika ada data ingredients, simpan relasi dan hitung maxBeli untuk menu baru
    if (parsedIngredients.length > 0) {
      const menuIngredientsData = parsedIngredients.map((ing: any) => ({
        menuId: newMenu.id,
        ingredientId: ing.ingredientId,
        amount: ing.amount,
      }));

      await prisma.menuIngredient.createMany({
        data: menuIngredientsData,
      });

      // Hitung maxBeli untuk menu baru
      let maxBeli = Infinity;
      for (const ingData of parsedIngredients) {
        const ingRecord = await prisma.ingredient.findUnique({
          where: { id: ingData.ingredientId },
        });
        if (ingRecord) {
          const possible = Math.floor(ingRecord.stock / ingData.amount);
          maxBeli = Math.min(maxBeli, possible);
        }
      }
      if (maxBeli === Infinity) {
        maxBeli = 0;
      }
      // Update field maxBeli pada menu baru
      await prisma.menu.update({
        where: { id: newMenu.id },
        data: { maxBeli },
      });
    } else {
      // Jika tidak ada ingredients, set maxBeli ke 0
      await prisma.menu.update({
        where: { id: newMenu.id },
        data: { maxBeli: 0 },
      });
    }

    // --- Recalculate maxBeli untuk semua menu yang menggunakan bahan yang sama ---
    const affectedIngredientIds = parsedIngredients.map((ing: any) => ing.ingredientId);
    if (affectedIngredientIds.length > 0) {
      const menusToRecalculate = await prisma.menu.findMany({
        where: {
          ingredients: {
            some: { ingredientId: { in: affectedIngredientIds } },
          },
        },
        include: {
          ingredients: {
            include: { ingredient: true },
          },
        },
      });

      for (const menu of menusToRecalculate) {
        let newMaxBeli = Infinity;
        for (const mi of menu.ingredients) {
          if (mi.amount > 0) {
            const possible = Math.floor(mi.ingredient.stock / mi.amount);
            newMaxBeli = Math.min(newMaxBeli, possible);
          } else {
            newMaxBeli = 0;
            break;
          }
        }
        if (newMaxBeli === Infinity) {
          newMaxBeli = 0;
        }
        await prisma.menu.update({
          where: { id: menu.id },
          data: { maxBeli: newMaxBeli },
        });
      }
    }

    // Jika field discountId ada dan tidak kosong, buat record pada MenuDiscount
    if (discountId && discountId.toString().trim() !== "") {
      const parsedDiscountId = parseInt(discountId.toString());
      await prisma.menuDiscount.create({
        data: {
          menuId: newMenu.id,
          discountId: parsedDiscountId,
        },
      });
    }

    return res
      .status(200)
      .json({ message: "Menu berhasil dibuat", menu: newMenu });
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
