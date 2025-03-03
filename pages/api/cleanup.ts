import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const now = new Date();
    const yesterday = new Date(now.setDate(now.getDate() - 1));

    const expiredReservations = await prisma.reservasi.findMany({
      where: {
        tanggalReservasi: { lte: yesterday },
        status: { in: ["BOOKED", "RESERVED", "OCCUPIED"] },
      },
    });

    await prisma.$transaction(async (prisma) => {
      for (const reservasi of expiredReservations) {
        await prisma.reservasi.update({
          where: { id: reservasi.id },
          data: { status: "COMPLETED" },
        });
        await prisma.dataMeja.deleteMany({
          where: { nomorMeja: parseInt(reservasi.nomorMeja || "0", 10) },
        });
      }
    });

    res.status(200).json({ message: "Pembersihan selesai" });
  } catch (error) {
    console.error("Error cleaning up reservations:", error);
    res.status(500).json({ error: "Gagal membersihkan reservasi" });
  } finally {
    await prisma.$disconnect();
  }
}