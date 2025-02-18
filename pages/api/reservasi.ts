import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
// import moment from "moment-timezone";

const prisma = new PrismaClient();


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { namaCustomer, nomorKontak, tanggalReservasi, jumlahTamu, durasiPemesanan, nomorMeja, kodeBooking } = req.body;

    // Validasi field yang diperlukan
    if (!namaCustomer || !nomorKontak || !tanggalReservasi || !jumlahTamu || !durasiPemesanan || !nomorMeja || !kodeBooking) {
      return res.status(400).json({ message: "Semua field harus diisi!" });
    }

    // // Konversi tanggalReservasi ke zona waktu yang diinginkan (misalnya: Asia/Jakarta)
    // const reservasiDate = moment.tz(tanggalReservasi, "Asia/Jakarta").toDate();
        const reservasiDate = new Date(tanggalReservasi);

    // Simpan reservasi ke database dengan kode booking dari frontend
    const newReservasi = await prisma.reservasi.create({
      data: {
        namaCustomer,
        nomorKontak,
        tanggalReservasi: reservasiDate, // Gunakan tanggal yang sudah dikonversi
        jumlahTamu,
        durasiPemesanan,
        nomorMeja,
        kodeBooking, // Gunakan kode booking dari frontend
        status: "BOOKED", // Status default
      },
    });

    return res.status(201).json(newReservasi);
  } catch (error) {
    console.error("Error saat menyimpan reservasi:", error);
    return res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
}
