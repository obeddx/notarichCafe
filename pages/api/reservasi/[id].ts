// pages/api/reservasi/[id].ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (typeof id !== "string") {
    return res.status(400).json({ message: "ID tidak valid" });
  }

  if (req.method === "PUT") {
    try {
      const { namaCustomer, nomorKontak, tanggalReservasi, jumlahTamu, durasiPemesanan, nomorMeja, kodeBooking, status } = req.body;
      
      // Validasi data sesuai kebutuhan
      if (!namaCustomer || !nomorKontak || !tanggalReservasi || !jumlahTamu || !durasiPemesanan || !nomorMeja || !kodeBooking || !status) {
        return res.status(400).json({ message: "Semua field harus diisi!" });
      }

      const updatedReservasi = await prisma.reservasi.update({
        where: { id: Number(id) },
        data: {
          namaCustomer,
          nomorKontak,
          tanggalReservasi: new Date(tanggalReservasi),
          jumlahTamu,
          durasiPemesanan,
          nomorMeja,
          kodeBooking,
          status,
        },
      });
      return res.status(200).json(updatedReservasi);
    } catch (error) {
      console.error("Error updating reservasi:", error);
      return res.status(500).json({ message: "Terjadi kesalahan saat mengupdate reservasi" });
    }
  } else if (req.method === "DELETE") {
    try {
      await prisma.reservasi.delete({
        where: { id: Number(id) },
      });
      return res.status(200).json({ message: "Reservasi berhasil dihapus" });
    } catch (error) {
      console.error("Error deleting reservasi:", error);
      return res.status(500).json({ message: "Terjadi kesalahan saat menghapus reservasi" });
    }
  } else {
    return res.status(405).json({ message: "Method Not Allowed" });
  }
}
