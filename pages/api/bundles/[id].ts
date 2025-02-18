import type { NextApiRequest, NextApiResponse } from "next";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false, // Nonaktifkan body parser bawaan Next.js
  },
};

const prisma = new PrismaClient();

// Tentukan folder untuk menyimpan file upload
const uploadDir = path.join(process.cwd(), "/public/uploads");

// Pastikan direktori upload sudah ada
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi storage untuk multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});
const upload = multer({ storage });

// Helper untuk menjalankan middleware secara manual
function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: Function
): Promise<void> {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve();
    });
  });
}

// Perluas tipe NextApiRequest agar mendukung properti file dari multer
interface NextApiRequestWithFile extends NextApiRequest {
  file?: Express.Multer.File;
}

export default async function handler(
  req: NextApiRequestWithFile,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (req.method === "PUT") {
    try {
      // Jalankan middleware multer untuk memproses field file (key "image")
      await runMiddleware(req, res, upload.single("image"));

      // Ambil data dari req.body (multer sudah memparsing field non-file)
      const name = req.body.name;
      const description = req.body.description;
      const bundlePrice = parseFloat(req.body.bundlePrice);
      // Field menus dikirim sebagai JSON string
      const menus = JSON.parse(req.body.menus) as { menuId: number; quantity: number }[];

      // Jika ada file gambar baru, ambil filename dari req.file
      let imageUrl: string | undefined = undefined;
      if (req.file) {
        imageUrl = `/uploads/${req.file.filename}`;
      }

      // Update data bundle utama di database
      const updatedBundle = await prisma.bundle.update({
        where: { id: Number(id) },
        data: {
          name,
          description,
          bundlePrice,
          ...(imageUrl ? { image: imageUrl } : {}), // Update image jika ada file baru
        },
      });

      // Perbarui relasi bundleMenus:
      // 1. Hapus semua bundleMenus lama untuk bundle ini
      await prisma.bundleMenu.deleteMany({
        where: { bundleId: Number(id) },
      });

      // 2. Tambahkan bundleMenus baru sesuai data yang dikirim
      const newBundleMenus = menus.map((menuItem) => ({
        bundleId: Number(id),
        menuId: menuItem.menuId,
        quantity: menuItem.quantity,
      }));

      if (newBundleMenus.length > 0) {
        await prisma.bundleMenu.createMany({
          data: newBundleMenus,
          skipDuplicates: true,
        });
      }

      return res.status(200).json({
        message: "Bundle updated successfully",
        bundle: updatedBundle,
      });
    } catch (error) {
      console.error("Error updating bundle:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  } else if (req.method === "DELETE") {
    try {
      // Soft delete: ubah isActive menjadi false
      const deletedBundle = await prisma.bundle.update({
        where: { id: Number(id) },
        data: { isActive: false },
      });
      return res.status(200).json({
        message: "Bundle deleted successfully",
        bundle: deletedBundle,
      });
    } catch (error) {
      console.error("Error deleting bundle:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  } else {
    return res.status(405).json({ message: "Method not allowed" });
  }
}
