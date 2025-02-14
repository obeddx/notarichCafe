// pages/api/resetTable.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { tableNumber } = req.body;

    try {
      // Hapus pesanan yang berstatus "Selesai" berdasarkan nomor meja
      await prisma.order.deleteMany({
        where: {
          tableNumber: tableNumber,
          status: "Selesai",
        },
      });

      // Hapus data meja dari tabel DataMeja
      await prisma.dataMeja.deleteMany({
        where: {
          nomorMeja: parseInt(tableNumber, 10),
        },
      });

      res.status(200).json({ message: `Meja ${tableNumber} berhasil direset` });
    } catch (error) {
      console.error("Error resetting table:", error);
      res.status(500).json({ error: "Gagal mereset meja" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
