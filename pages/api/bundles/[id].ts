// pages/api/bundle/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import multer from "multer";
import { PrismaClient, MenuType } from "@prisma/client";
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
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    console.log(req)
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});
const upload = multer({ storage });

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
      return resolve(result);
    });
  });
}

interface NextApiRequestWithFile extends NextApiRequest {
  file?: Express.Multer.File;
}

export default async function handler(
  req: NextApiRequestWithFile,
  res: NextApiResponse
) {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ message: "Missing bundle id" });
  }

  if (req.method === "PUT") {
    try {
      // Cek content-type request
      const contentType = req.headers["content-type"] || "";
      // Jika request multipart, jalankan branch update lengkap bundle
      if (contentType.includes("multipart/form-data")) {
        await runMiddleware(req, res, upload.single("image"));

        const { name, description, price, includedMenus } = req.body;
        // includedMenus diharapkan dikirim sebagai JSON string dari array objek { menuId, amount }
        let parsedMenuRows: { menuId: number; amount: number }[] = [];
        if (includedMenus) {
          parsedMenuRows =
            typeof includedMenus === "string"
              ? JSON.parse(includedMenus)
              : includedMenus;
        }
        // Jika ada file gambar baru, ambil URL-nya
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

        if (!name || !price) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        // Update data bundle utama
        const updatedBundle = await prisma.menu.update({
          where: { id: Number(id) },
          data: {
            name,
            description: description || null,
            price: parseFloat(price),
            ...(imageUrl ? { image: imageUrl } : {}),
          },
        });

        // Perbarui relasi bundleMenus (tabel pivot)
        // Hapus semua data lama
        await prisma.menuComposition.deleteMany({
          where: { bundleId: Number(id) },
        });

        // Jika ada data baru, buat relasi baru
        if (parsedMenuRows && parsedMenuRows.length > 0) {
          await prisma.menuComposition.createMany({
            data: parsedMenuRows.map((row) => ({
              bundleId: Number(id),
              menuId: row.menuId,
              amount: row.amount,
            })),
            skipDuplicates: true,
          });
        }

        const result = await prisma.menu.findUnique({
          where: { id: Number(id) },
          include: {
            bundleCompositions: {
              include: {
                menu: true,
              },
            },
          },
        });

        return res.status(200).json({
          message: "Bundle updated successfully",
          bundle: result,
        });
      } else {
        // Jika bukan multipart, asumsikan JSON request untuk toggle status
        // Karena bodyParser dinonaktifkan, kita perlu mengumpulkan stream body secara manual
        let body = "";
        await new Promise<void>((resolve, reject) => {
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", () => resolve());
          req.on("error", (err) => reject(err));
        });
        const parsed = JSON.parse(body);
        const { isActive } = parsed;
        if (isActive === undefined) {
          return res.status(400).json({ message: "Missing isActive field" });
        }
        const updatedBundle = await prisma.menu.update({
          where: { id: Number(id) },
          data: { isActive },
        });
        return res.status(200).json({
          message: "Bundle status updated successfully",
          bundle: updatedBundle,
        });
      }
    } catch (error) {
      console.error("Error updating bundle:", error);
      return res.status(500).json({ message: "Internal server error" });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === "DELETE") {
    try {
      // Soft delete: ubah isActive menjadi false
      const deletedBundle = await prisma.menu.update({
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
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.setHeader("Allow", ["PUT", "DELETE"]);
    return res.status(405).json({ message: "Method not allowed" });
  }
}
