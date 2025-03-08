import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { io } from "socket.io-client";

const prisma = new PrismaClient();
const SOCKET_URL = "http://localhost:3000";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET: Mengambil semua data reservasi
  if (req.method === "GET") {
    try {
      const reservasis = await prisma.reservasi.findMany({
        orderBy: { tanggalReservasi: "asc" },
      });
      res.setHeader("X-Server-Time", new Date().toISOString());
      return res.status(200).json(reservasis);
    } catch (error) {
      console.error("Error fetching reservasi:", error);
      return res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  }

  // POST: Menambahkan reservasi baru
  else if (req.method === "POST") {
    try {
      const { namaCustomer, nomorKontak, tanggalReservasi, durasiPemesanan, nomorMeja, kodeBooking } = req.body;

      if (!namaCustomer || !nomorKontak || !tanggalReservasi || !durasiPemesanan || !nomorMeja || !kodeBooking) {
        return res.status(400).json({ message: "Semua field harus diisi!" });
      }

      const reservasiDate = new Date(tanggalReservasi);
      const parsedNomorMeja = Number(nomorMeja);

      if (isNaN(parsedNomorMeja)) {
        return res.status(400).json({ message: "Nomor meja harus berupa angka" });
      }

      // Cek apakah meja sudah ada di DataMeja
      const existingTable = await prisma.dataMeja.findFirst({
        where: { nomorMeja: parsedNomorMeja },
      });

      // Jika belum ada, tambahkan dengan isManuallyMarked=false
      if (!existingTable) {
        await prisma.dataMeja.create({
          data: {
            nomorMeja: parsedNomorMeja,
            isManuallyMarked: false,
            markedAt: null,
          },
        });
      }
      // Jika sudah ada, jangan ubah isManuallyMarked atau markedAt

      // Cek apakah reservasi untuk hari ini
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isToday = reservasiDate.toDateString() === today.toDateString();

      // Buat reservasi
      const newReservasi = await prisma.reservasi.create({
        data: {
          namaCustomer,
          nomorKontak,
          tanggalReservasi: reservasiDate,
          durasiPemesanan,
          nomorMeja: nomorMeja.toString(),
          kodeBooking,
          status: "BOOKED",
        },
      });

      // Hanya buat pesanan otomatis jika reservasi untuk hari ini
      if (isToday) {
        const existingOrder = await prisma.order.findFirst({
          where: {
            reservasiId: newReservasi.id,
          },
        });

        if (!existingOrder) {
          await prisma.order.create({
            data: {
              tableNumber: nomorMeja.toString(),
              reservasiId: newReservasi.id,
              status: "PENDING",
              createdAt: new Date(),
            },
          });
        }
      }

      const socket = io(SOCKET_URL, { path: "/api/socket" });
      socket.emit("reservationAdded", newReservasi);

      return res.status(201).json(newReservasi);
    } catch (error) {
      console.error("Error saat menyimpan reservasi:", error);
      return res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  }

  // PUT: Mengupdate reservasi
  else if (req.method === "PUT") {
    try {
      const { id } = req.query;
      const { namaCustomer, nomorKontak, tanggalReservasi, durasiPemesanan, nomorMeja, kodeBooking, status } = req.body;

      if (!id || !namaCustomer || !nomorKontak || !tanggalReservasi || !durasiPemesanan || !nomorMeja || !kodeBooking) {
        return res.status(400).json({ message: "Semua field harus diisi!" });
      }

      const parsedId = Number(id);
      const parsedNomorMeja = Number(nomorMeja);

      if (isNaN(parsedId) || isNaN(parsedNomorMeja)) {
        return res.status(400).json({ message: "ID atau nomor meja tidak valid" });
      }

      const updatedReservasi = await prisma.reservasi.update({
        where: { id: parsedId },
        data: {
          namaCustomer,
          nomorKontak,
          tanggalReservasi: new Date(tanggalReservasi),
          durasiPemesanan,
          nomorMeja: nomorMeja.toString(),
          kodeBooking,
          status,
        },
      });

      const existingTable = await prisma.dataMeja.findFirst({
        where: { nomorMeja: parsedNomorMeja },
      });

      if (!existingTable) {
        await prisma.dataMeja.create({
          data: {
            nomorMeja: parsedNomorMeja,
            isManuallyMarked: false,
            markedAt: null,
          },
        });
      }

      // Update pesanan jika reservasi jadi hari ini
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isToday = new Date(tanggalReservasi).toDateString() === today.toDateString();

      if (isToday) {
        const existingOrder = await prisma.order.findFirst({
          where: { reservasiId: parsedId },
        });

        if (!existingOrder) {
          await prisma.order.create({
            data: {
              tableNumber: nomorMeja.toString(),
              reservasiId: parsedId,
              status: "PENDING",
              createdAt: new Date(),
            },
          });
        }
      }

      const socket = io(SOCKET_URL, { path: "/api/socket" });
      socket.emit("reservationUpdated", updatedReservasi);

      return res.status(200).json(updatedReservasi);
    } catch (error) {
      console.error("Error updating reservasi:", error);
      return res.status(500).json({ message: "Terjadi kesalahan saat mengupdate" });
    }
  }

  // DELETE: Menghapus reservasi
  else if (req.method === "DELETE") {
    try {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ message: "ID reservasi diperlukan" });
      }

      const parsedId = Number(id);
      if (isNaN(parsedId)) {
        return res.status(400).json({ message: "ID reservasi harus berupa angka" });
      }

      const reservasi = await prisma.reservasi.findUnique({
        where: { id: parsedId },
      });

      if (!reservasi) {
        return res.status(404).json({ message: "Reservasi tidak ditemukan" });
      }

      const relatedOrder = await prisma.order.findFirst({
        where: { reservasiId: parsedId },
      });

      if (relatedOrder) {
        await prisma.order.delete({
          where: { id: relatedOrder.id },
        });
      }

      await prisma.reservasi.delete({
        where: { id: parsedId },
      });

      const parsedNomorMeja = Number(reservasi.nomorMeja);
      if (!isNaN(parsedNomorMeja)) {
        const table = await prisma.dataMeja.findFirst({
          where: { nomorMeja: parsedNomorMeja },
        });

        if (table && !table.isManuallyMarked) {
          await prisma.dataMeja.delete({
            where: { id: table.id },
          });
        }
      }

      const socket = io(SOCKET_URL, { path: "/api/socket" });
      socket.emit("reservationDeleted", { reservasiId: parsedId, orderId: relatedOrder?.id });
      socket.emit("ordersUpdated", { deletedOrderId: relatedOrder?.id });
      socket.emit("tableStatusUpdated", { tableNumber: reservasi.nomorMeja });

      return res.status(200).json({ message: "Reservasi dan pesanan terkait berhasil dihapus" });
    } catch (error) {
      console.error("Error deleting reservasi:", error);
      return res.status(500).json({ message: "Terjadi kesalahan saat menghapus" });
    }
  }

  else {
    return res.status(405).json({ message: "Method Not Allowed" });
  }
}