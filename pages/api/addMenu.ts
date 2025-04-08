import type { NextApiRequest, NextApiResponse } from "next";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { IncomingMessage, ServerResponse } from "http";

const prisma = new PrismaClient();

const uploadDir = path.join(process.cwd(), "public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(req)
     console.log(file)
    cb(null, "./public/uploads");
  },
  filename: (req, file, cb) => {
    console.log(req)
    const ext = file.originalname.split(".").pop();
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    cb(null, filename);
  },
});

const upload = multer({ storage });

interface NextApiRequestWithFile extends NextApiRequest {
  file?: Express.Multer.File;
}

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

export default async function handler(
  req: NextApiRequestWithFile,
  res: NextApiResponse
) {
  try {
    if (req.method === "POST") {
      await runMiddleware(req, res, upload.single("image"));

      const {
        name,
        description,
        price,
        ingredients,
        category,
        Status,
        discountId,
        modifierIds,
      } = req.body;
      const imagePath = req.file ? `/uploads/${req.file.filename}` : "";

      if (!name || !price || !imagePath) {
        return res.status(400).json({ message: "Name, Price, dan Image wajib diisi" });
      }

      const menuPrice = parseFloat(price);
      let parsedIngredients: { ingredientId: number; amount: number }[] = [];
      let parsedModifierIds: number[] = [];

      if (ingredients) {
        parsedIngredients = JSON.parse(ingredients);
      }

      if (modifierIds) {
        parsedModifierIds = JSON.parse(modifierIds);
        const existingModifiers = await prisma.modifier.findMany({
          where: { id: { in: parsedModifierIds } },
          select: { id: true },
        });
        const invalidIds = parsedModifierIds.filter(
          (id) => !existingModifiers.some((mod) => mod.id === id)
        );
        if (invalidIds.length > 0) {
          return res.status(400).json({
            message: `Modifier dengan ID ${invalidIds.join(", ")} tidak ditemukan`,
          });
        }
      }

      const newMenu = await prisma.menu.create({
        data: {
          name,
          description: description || null,
          price: menuPrice,
          image: imagePath,
          hargaBakul: 2000,
          category,
          Status,
          ingredients: {
            create: parsedIngredients.map((ing) => ({
              ingredientId: ing.ingredientId,
              amount: ing.amount,
            })),
          },
          modifiers: {
            create: parsedModifierIds.map((modifierId) => ({
              modifier: { connect: { id: modifierId } },
            })),
          },
        },
        include: {
          ingredients: true,
          modifiers: { include: { modifier: { include: { category: true } } } }, // Sertakan kategori
        },
      });

      if (parsedIngredients.length > 0) {
        let maxBeli = Infinity;
        for (const ingData of parsedIngredients) {
          const ingRecord = await prisma.ingredient.findUnique({
            where: { id: ingData.ingredientId },
          });
          if (ingRecord) {
            const possible = Math.floor(ingRecord.stock / ingData.amount);
            maxBeli = Math.min(maxBeli, possible);
          } else {
            return res.status(400).json({
              message: `Ingredient dengan ID ${ingData.ingredientId} tidak ditemukan`,
            });
          }
        }
        if (maxBeli === Infinity) maxBeli = 0;
        await prisma.menu.update({
          where: { id: newMenu.id },
          data: { maxBeli },
        });

        const affectedIngredientIds = parsedIngredients.map((ing) => ing.ingredientId);
        const menusToRecalculate = await prisma.menu.findMany({
          where: {
            id: { not: newMenu.id },
            ingredients: {
              some: { ingredientId: { in: affectedIngredientIds } },
            },
          },
          include: {
            ingredients: { include: { ingredient: true } },
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
          if (newMaxBeli === Infinity) newMaxBeli = 0;
          await prisma.menu.update({
            where: { id: menu.id },
            data: { maxBeli: newMaxBeli },
          });
        }
      } else {
        await prisma.menu.update({
          where: { id: newMenu.id },
          data: { maxBeli: 0 },
        });
      }

      if (discountId && discountId.toString().trim() !== "") {
        const parsedDiscountId = parseInt(discountId.toString());
        await prisma.menuDiscount.create({
          data: {
            menuId: newMenu.id,
            discountId: parsedDiscountId,
          },
        });
      }

      return res.status(200).json({ message: "Menu berhasil dibuat", menu: newMenu });
    } else if (req.method === "PUT") {
      await runMiddleware(req, res, upload.single("image"));

      const {
        id,
        name,
        description,
        price,
        ingredients,
        category,
        Status,
        discountId,
        modifierIds,
      } = req.body;
      const imagePath = req.file ? `/uploads/${req.file.filename}` : undefined;

      if (!id || !name || !price) {
        return res.status(400).json({ message: "ID, Name, dan Price wajib diisi" });
      }

      const menuId = parseInt(id);
      const menuPrice = parseFloat(price);
      let parsedIngredients: { ingredientId: number; amount: number }[] = [];
      let parsedModifierIds: number[] = [];

      if (ingredients) {
        parsedIngredients = JSON.parse(ingredients);
      }

      if (modifierIds) {
        parsedModifierIds = JSON.parse(modifierIds);
        const existingModifiers = await prisma.modifier.findMany({
          where: { id: { in: parsedModifierIds } },
          select: { id: true },
        });
        const invalidIds = parsedModifierIds.filter(
          (id) => !existingModifiers.some((mod) => mod.id === id)
        );
        if (invalidIds.length > 0) {
          return res.status(400).json({
            message: `Modifier dengan ID ${invalidIds.join(", ")} tidak ditemukan`,
          });
        }
      }

      await prisma.menuIngredient.deleteMany({ where: { menuId } });
      await prisma.menuModifier.deleteMany({ where: { menuId } });
      await prisma.menuDiscount.deleteMany({ where: { menuId } });

      const updatedMenu = await prisma.menu.update({
        where: { id: menuId },
        data: {
          name,
          description: description || null,
          price: menuPrice,
          image: imagePath,
          category,
          Status,
          ingredients: {
            create: parsedIngredients.map((ing) => ({
              ingredientId: ing.ingredientId,
              amount: ing.amount,
            })),
          },
          modifiers: {
            create: parsedModifierIds.map((modifierId) => ({
              modifier: { connect: { id: modifierId } },
            })),
          },
        },
        include: {
          ingredients: true,
          modifiers: { include: { modifier: { include: { category: true } } } },
          discounts: true,
        },
      });

      if (parsedIngredients.length > 0) {
        let maxBeli = Infinity;
        for (const ingData of parsedIngredients) {
          const ingRecord = await prisma.ingredient.findUnique({
            where: { id: ingData.ingredientId },
          });
          if (ingRecord) {
            const possible = Math.floor(ingRecord.stock / ingData.amount);
            maxBeli = Math.min(maxBeli, possible);
          } else {
            return res.status(400).json({
              message: `Ingredient dengan ID ${ingData.ingredientId} tidak ditemukan`,
            });
          }
        }
        if (maxBeli === Infinity) maxBeli = 0;
        await prisma.menu.update({
          where: { id: menuId },
          data: { maxBeli },
        });

        const affectedIngredientIds = parsedIngredients.map((ing) => ing.ingredientId);
        const menusToRecalculate = await prisma.menu.findMany({
          where: {
            id: { not: menuId },
            ingredients: {
              some: { ingredientId: { in: affectedIngredientIds } },
            },
          },
          include: {
            ingredients: { include: { ingredient: true } },
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
          if (newMaxBeli === Infinity) newMaxBeli = 0;
          await prisma.menu.update({
            where: { id: menu.id },
            data: { maxBeli: newMaxBeli },
          });
        }
      } else {
        await prisma.menu.update({
          where: { id: menuId },
          data: { maxBeli: 0 },
        });
      }

      if (discountId && discountId.toString().trim() !== "") {
        const parsedDiscountId = parseInt(discountId.toString());
        await prisma.menuDiscount.create({
          data: {
            menuId: updatedMenu.id,
            discountId: parsedDiscountId,
          },
        });
      }

      return res.status(200).json({ message: "Menu berhasil diperbarui", menu: updatedMenu });
    } else {
      return res.status(405).json({ message: "Method not allowed" });
    }
  } catch (error: any) {
    console.error("Error handling request:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message || "Unknown error" });
  } finally {
    await prisma.$disconnect();
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};