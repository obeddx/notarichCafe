// pages/api/validate-user.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Hanya izinkan metode POST
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { userToken, role } = req.body;

  // Validasi input
  if (!userToken || !role) {
    return res.status(400).json({ message: "userToken and role are required" });
  }

  try {
    // Cari pengguna berdasarkan token
    const user = await prisma.user.findUnique({
      where: { token: userToken },
    });

    // Jika pengguna tidak ditemukan
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Jika role tidak sesuai
    if (user.role !== role) {
      return res.status(403).json({ message: "Forbidden: Role mismatch" });
    }

    // Jika token memiliki masa berlaku, tambahkan pengecekan kedaluwarsa
    // Contoh: Jika token memiliki field `expiresAt`
    // if (user.tokenExpiresAt && new Date(user.tokenExpiresAt) < new Date()) {
    //   return res.status(401).json({ message: "Token expired" });
    // }

    // Jika validasi berhasil, kembalikan respons sukses
    return res.status(200).json({ message: "Authorized", user });
  } catch (error) {
    console.error("Validation error:", error);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    // Tutup koneksi Prisma
    await prisma.$disconnect();
  }
}