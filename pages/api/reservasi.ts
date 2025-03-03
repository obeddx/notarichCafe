import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { io } from "socket.io-client";

const prisma = new PrismaClient();
const SOCKET_URL = "http://localhost:3000";

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
      const { namaCustomer, nomorKontak, tanggalReservasi, durasiPemesanan, nomorMeja, kodeBooking } = req.body;

      if (!namaCustomer || !nomorKontak || !tanggalReservasi || !durasiPemesanan || !nomorMeja || !kodeBooking) {
        return res.status(400).json({ message: "Semua field harus diisi!" });
      }

      const reservasiDate = new Date(tanggalReservasi);

      const newReservasi = await prisma.reservasi.create({
        data: {
          namaCustomer,
          nomorKontak,
          tanggalReservasi: reservasiDate,
          durasiPemesanan,
          nomorMeja,
          kodeBooking,
          status: "BOOKED",
        },
      });

      const socket = io(SOCKET_URL, { path: "/api/socket" });
      socket.emit("reservationAdded", newReservasi);

      return res.status(201).json(newReservasi);
    } catch (error) {
      console.error("Error saat menyimpan reservasi:", error);
      return res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  } else if (req.method === "PUT") {
    try {
      const { id } = req.query;
      const { namaCustomer, nomorKontak, tanggalReservasi, durasiPemesanan, nomorMeja, kodeBooking, status } = req.body;

      if (!id || !namaCustomer || !nomorKontak || !tanggalReservasi || !durasiPemesanan || !nomorMeja || !kodeBooking) {
        return res.status(400).json({ message: "Semua field harus diisi!" });
      }

      const updatedReservasi = await prisma.reservasi.update({
        where: { id: Number(id) },
        data: {
          namaCustomer,
          nomorKontak,
          tanggalReservasi: new Date(tanggalReservasi),
          durasiPemesanan,
          nomorMeja,
          kodeBooking,
          status,
        },
      });

      const socket = io(SOCKET_URL, { path: "/api/socket" });
      socket.emit("reservationUpdated", updatedReservasi);

      return res.status(200).json(updatedReservasi);
    } catch (error) {
      console.error("Error updating reservasi:", error);
      return res.status(500).json({ message: "Terjadi kesalahan saat mengupdate" });
    }
  } else if (req.method === "DELETE") {
    try {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ message: "ID reservasi diperlukan" });
      }

      const reservasi = await prisma.reservasi.findUnique({
        where: { id: Number(id) },
      });

      if (!reservasi) {
        return res.status(404).json({ message: "Reservasi tidak ditemukan" });
      }

      // Hapus pesanan terkait jika ada
      const relatedOrder = await prisma.order.findFirst({
        where: { reservasiId: Number(id) },
      });

      if (relatedOrder) {
        await prisma.order.delete({
          where: { id: relatedOrder.id },
        });
      }

      // Hapus reservasi
      await prisma.reservasi.delete({
        where: { id: Number(id) },
      });

      // Hapus entri DataMeja jika ada untuk mengubah status meja menjadi tersedia
      await prisma.dataMeja.deleteMany({
        where: { nomorMeja: parseInt(reservasi.nomorMeja || "0", 10) },
      });

      // Emit event ke WebSocket untuk sinkronisasi real-time
      const socket = io(SOCKET_URL, { path: "/api/socket" });
      socket.emit("reservationDeleted", { reservasiId: Number(id), orderId: relatedOrder?.id });
      socket.emit("ordersUpdated", { deletedOrderId: relatedOrder?.id });
      socket.emit("tableStatusUpdated", { tableNumber: reservasi.nomorMeja });

      return res.status(200).json({ message: "Reservasi dan pesanan terkait berhasil dihapus" });
    } catch (error) {
      console.error("Error deleting reservasi:", error);
      return res.status(500).json({ message: "Terjadi kesalahan saat menghapus" });
    }
  } else {
    return res.status(405).json({ message: "Method Not Allowed" });
  }
}