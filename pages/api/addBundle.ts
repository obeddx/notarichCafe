// pages/api/addBundle.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, MenuType } from "@prisma/client";
import multer from "multer";
import fs from "fs";
import path from "path";
import { IncomingMessage, ServerResponse } from "http";

export const config = {
  api: {
    bodyParser: false, // Nonaktifkan body parser bawaan Next.js
  },
};

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
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Jalankan middleware multer untuk menangani file upload
    await runMiddleware(req, res, upload.single("image"));

    const { name, description, price, includedMenus, discountId, modifierIds } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : "";

    // Validasi field wajib
    if (!name || !price) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Buat record Menu baru dengan type BUNDLE
    const newBundle = await prisma.menu.create({
      data: {
        name,
        description: description || null,
        image: imagePath || "",
        price: parseFloat(price),
        category: "bundle",
        Status: "tersedia",
        type: MenuType.BUNDLE,
      },
    });

    // Parse includedMenus sebagai array dari objek { menuId, amount }
    let parsedMenuRows: { menuId: number; amount: number }[] = [];
    if (includedMenus) {
      parsedMenuRows =
        typeof includedMenus === "string"
          ? JSON.parse(includedMenus)
          : includedMenus;
    }

    // Buat relasi di tabel MenuComposition jika ada data
    if (parsedMenuRows && Array.isArray(parsedMenuRows) && parsedMenuRows.length > 0) {
      await Promise.all(
        parsedMenuRows.map(async (row) => {
          return await prisma.menuComposition.create({
            data: {
              bundleId: newBundle.id,
              menuId: row.menuId,
              amount: row.amount,
            },
          });
        })
      );
    }

    // Jika discountId dikirimkan, buat record di tabel menuDiscount
    if (discountId && discountId.toString().trim() !== "") {
      const parsedDiscountId = parseInt(discountId.toString());
      await prisma.menuDiscount.create({
        data: {
          menuId: newBundle.id,
          discountId: parsedDiscountId,
        },
      });
    }

    // Jika modifierIds dikirimkan, buat record di tabel menuModifier
    if (modifierIds) {
      let parsedModifierIds: number[] = [];
      parsedModifierIds =
        typeof modifierIds === "string"
          ? JSON.parse(modifierIds)
          : modifierIds;
      if (Array.isArray(parsedModifierIds) && parsedModifierIds.length > 0) {
        await Promise.all(
          parsedModifierIds.map(async (modId: number) => {
            return await prisma.menuModifier.create({
              data: {
                menuId: newBundle.id,
                modifierId: modId,
              },
            });
          })
        );
      }
    }

    // Ambil data bundle lengkap dengan daftar menu yang termasuk
    const createdBundle = await prisma.menu.findUnique({
      where: { id: newBundle.id },
      include: {
        bundleCompositions: {
          include: {
            menu: true,
          },
        },
      },
    });

    return res.status(201).json({
      message: "Bundle created successfully",
      bundle: createdBundle,
    });
  } catch (error) {
    console.error("Error creating bundle:", error);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
}
