import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { tableNumber } = req.body;

    if (!tableNumber) {
      return res.status(400).json({ error: "Table number is required" });
    }

    try {
      // Hanya hapus pesanan dengan status "Selesai" dan tidak memiliki kode booking (reservasiId null)
      await prisma.order.deleteMany({
        where: {
          tableNumber: tableNumber,
          status: "Selesai",
          reservasiId: null, // Mengecualikan pesanan dengan kode booking
        },
      });

      // Hapus data meja dari tabel DataMeja (jika ada)
      await prisma.dataMeja.deleteMany({
        where: {
          nomorMeja: parseInt(tableNumber, 10),
        },
      });

      res.status(200).json({ message: `Meja ${tableNumber} berhasil direset` });
    } catch (error) {
      console.error("Error resetting table:", error);
      res.status(500).json({ error: "Gagal mereset meja" });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}