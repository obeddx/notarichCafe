import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Hanya terima request POST
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Ambil data notifikasi dari Midtrans
    const {
      order_id,             // Nomor order yang dikirim oleh Midtrans (pastikan ini sama dengan ID order di sistem Anda)
      transaction_status,   // Status transaksi misalnya "capture", "settlement", "pending", dll.
      fraud_status,         // Untuk transaksi kartu kredit, misalnya "accept" atau "challenge"
      payment_type,         // Jenis pembayaran, misalnya "ewallet", "bank_transfer", dll.
      // Bisa ada field tambahan seperti signature_key, etc.
    } = req.body;

    // Contoh validasi sederhana: jika transaksi sukses
    let isSuccess = false;
    if (transaction_status === "capture" && fraud_status === "accept") {
      isSuccess = true;
    } else if (transaction_status === "settlement") {
      isSuccess = true;
    }

    // Perbarui status order jika transaksi berhasil
    if (isSuccess) {
      // Pastikan order_id sesuai dengan tipe di database, misalnya angka
      const updatedOrder = await prisma.order.update({
        where: { id: parseInt(order_id) },
        data: {
          paymentMethod: payment_type,
          // Jika ada informasi paymentId dari Midtrans, Anda bisa menyimpannya
          status: "Paid",
        },
      });
      return res.status(200).json({ success: true, order: updatedOrder });
    } else {
      // Jika transaksi tidak berhasil, Anda bisa mengupdate status order menjadi pending atau gagal
      return res.status(200).json({ success: true, message: "Transaksi tidak berhasil atau masih pending", data: req.body });
    }
  } catch (error: unknown) {
    console.error("Error processing webhook:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}
