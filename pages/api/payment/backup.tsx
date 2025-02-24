// pages/api/payment/generateSnapToken.ts
import type { NextApiRequest, NextApiResponse } from "next";
import midtransClient from "midtrans-client";

// Fungsi untuk memformat tanggal sesuai dengan format yang diminta Midtrans: yyyy-MM-dd hh:mm:ss +0700
function formatDateForMidtrans(date: Date): string {
  const year = date.getFullYear();
  const month = ("0" + (date.getMonth() + 1)).slice(-2);
  const day = ("0" + date.getDate()).slice(-2);
  const hours = ("0" + date.getHours()).slice(-2);
  const minutes = ("0" + date.getMinutes()).slice(-2);
  const seconds = ("0" + date.getSeconds()).slice(-2);
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} +0700`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Ambil data transaksi dari body request
    const { orderId, total, customerName, customerEmail, customerPhone } = req.body;

    // Validasi data minimal
    if (!orderId || !total || !customerName) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Inisialisasi Midtrans Snap Client
    const snap = new midtransClient.Snap({
      isProduction: process.env.NODE_ENV === "production", // true jika di production
      serverKey: process.env.MIDTRANS_SERVER_KEY as string,
      clientKey: process.env.MIDTRANS_CLIENT_KEY as string,
    });

    // Format tanggal untuk expiry.start_time sesuai dengan format yang diminta
    const currentDate = new Date();
    const formattedStartTime = formatDateForMidtrans(currentDate);

    const validEmail =
    customerEmail && customerEmail.trim().length > 0 && customerEmail.includes("@")
    ? customerEmail
    : "customer@example.com";


    // Siapkan parameter transaksi sesuai dokumentasi Midtrans
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: total,
      },
      customer_details: {
        first_name: customerName,
        email: validEmail,
        phone: customerPhone || "",
      },      
      expiry: {
        start_time: formattedStartTime,
        unit: "minutes",
        duration: 60, // masa berlaku 60 menit
      },
    };

    // Memanggil API Midtrans untuk mendapatkan Snap Token
    const snapTokenResponse = await snap.createTransaction(parameter);

    // Mengembalikan snap token ke frontend
    return res.status(200).json({ success: true, snapToken: snapTokenResponse.token });
  } catch (error: unknown) {
    console.error("Error generating Snap token:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ success: false, message: "Failed to generate snap token", error: errorMessage });
  }
}
