import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    try {
      const { namaCustomer, nomorKontak, jumlahTamu, tanggalReservasi } = req.body;

      // Validasi input
      if (!namaCustomer || !nomorKontak || !jumlahTamu || !tanggalReservasi) {
        return res.status(400).json({ error: "Semua field harus diisi!" });
      }
      // Simpan ke database
      const newReservation = await prisma.reservasi.create({
        data: {
          namaCustomer,
          nomorKontak,
          jumlahTamu: Number(jumlahTamu),
          tanggalReservasi: new Date(tanggalReservasi), // Pastikan format datetime benar
        },
      });

      return res.status(201).json(newReservation);
    } catch (error) {
      console.error("Error saat menyimpan reservasi:", error);
      return res.status(500).json({ error: "Gagal menyimpan reservasi" });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
