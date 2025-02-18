import type { NextApiResponse } from "next";
import { NextApiRequest } from "next";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import fs from "fs";
import path from "path";

// Buat interface untuk request yang memiliki properti file
interface NextApiRequestWithFile extends NextApiRequest {
  file?: Express.Multer.File;
}

const prisma = new PrismaClient();

// Nonaktifkan built-in body parser Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};

// Gunakan memory storage untuk Multer (bisa disesuaikan jika ingin menyimpan langsung ke disk)
const upload = multer({ storage: multer.memoryStorage() });

// Helper untuk menjalankan middleware (Multer) di Next.js API
function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: Function
) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

interface MenuSelection {
  menuId: number;
  quantity: number;
}

interface AddBundlePayload {
  name: string;
  description?: string;
  bundlePrice?: number | null;
  menuSelections: MenuSelection[];
}

export default async function handler(
  req: NextApiRequestWithFile,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    // Jalankan middleware multer untuk menangani file upload (file key: "image")
    await runMiddleware(req, res, upload.single("image"));

    // Karena request berupa multipart/form-data,
    // req.body berisi field yang dikirim dalam bentuk string.
    // Pastikan untuk melakukan parse jika perlu.
    const { name, description, bundlePrice, menuSelections } = req.body;

    // menuSelections kemungkinan dikirim sebagai string JSON, jadi parse jika perlu
    let parsedMenuSelections: MenuSelection[];
    try {
      parsedMenuSelections =
        typeof menuSelections === "string"
          ? JSON.parse(menuSelections)
          : menuSelections;
    } catch (err) {
      return res.status(400).json({ message: "menuSelections tidak valid" });
    }

    // Validasi: nama paket dan minimal 2 menu harus diisi.
    if (
      !name ||
      !parsedMenuSelections ||
      !Array.isArray(parsedMenuSelections) ||
      parsedMenuSelections.length < 2
    ) {
      return res
        .status(400)
        .json({ message: "Nama paket dan minimal 2 menu harus diisi." });
    }

    // Jika terdapat file image, simpan ke direktori 'public/uploads'
    let imageUrl: string | null = null;
    if (req.file) {
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const fileName = `${Date.now()}-${req.file.originalname}`;
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, req.file.buffer);
      imageUrl = `/uploads/${fileName}`;
    }

    // Jika field image pada skema Prisma tidak mengizinkan null, gunakan nilai default ""
    const finalImageUrl = imageUrl ?? "";

    // Buat record Bundle (asumsikan model Bundle memiliki field "image" untuk menyimpan URL image)
    const newBundle = await prisma.bundle.create({
      data: {
        name,
        description,
        bundlePrice: bundlePrice ? Number(bundlePrice) : null,
        image: finalImageUrl,
      },
    });

    // Buat record pivot untuk setiap menu yang dipilih
    for (const selection of parsedMenuSelections) {
      // Opsional: tambahkan validasi untuk menuId dan quantity di sini
      await prisma.bundleMenu.create({
        data: {
          bundleId: newBundle.id,
          menuId: selection.menuId,
          quantity: selection.quantity,
        },
      });
    }

    res
      .status(200)
      .json({ message: "Paket bundling berhasil dibuat", bundle: newBundle });
  } catch (error) {
    console.error("Error creating bundle:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  } finally {
    await prisma.$disconnect();
  }
}
