import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { orderIds } = req.body;

    // Lakukan logika penggabungan pesanan di sini
    // Misalnya, update status pesanan atau buat pesanan baru yang menggabungkan pesanan-pesanan tersebut

    res.status(200).json({ message: "Pesanan berhasil digabungkan" });
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}