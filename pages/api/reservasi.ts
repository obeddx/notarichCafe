// pages/api/reservasi.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const reservasis = await prisma.reservasi.findMany({
        orderBy: { tanggalReservasi: "asc" },
      });
      return res.status(200).json(reservasis);
    } catch (error) {
      console.error("Error fetching reservasi:", error);
      return res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  } else if (req.method === "POST") {
    try {
      const { namaCustomer, nomorKontak, tanggalReservasi, jumlahTamu, durasiPemesanan, nomorMeja, kodeBooking } = req.body;

      if (!namaCustomer || !nomorKontak || !tanggalReservasi || !jumlahTamu || !durasiPemesanan || !nomorMeja || !kodeBooking) {
        return res.status(400).json({ message: "Semua field harus diisi!" });
      }

      const reservasiDate = new Date(tanggalReservasi);

      const newReservasi = await prisma.reservasi.create({
        data: {
          namaCustomer,
          nomorKontak,
          tanggalReservasi: reservasiDate,
          jumlahTamu,
          durasiPemesanan,
          nomorMeja,
          kodeBooking,
          status: "BOOKED",
        },
      });

      return res.status(201).json(newReservasi);
    } catch (error) {
      console.error("Error saat menyimpan reservasi:", error);
      return res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  } else {
    return res.status(405).json({ message: "Method Not Allowed" });
  }
}
