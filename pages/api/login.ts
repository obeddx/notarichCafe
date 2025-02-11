// pages/api/login.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

/**
 * Fungsi untuk melakukan hashing pada password menggunakan metode pbkdf2Sync.
 * Perhatian: Menggunakan salt tetap hanya untuk demonstrasi.
 */
function hashPassword(password: string): string {
  const salt = "fixed_salt"; // Untuk demonstrasi; di produksi, gunakan salt unik per user
  const iterations = 1000;
  const keyLength = 64;
  const digest = "sha512";
  const hashed = crypto.pbkdf2Sync(password, salt, iterations, keyLength, digest).toString("hex");
  return hashed;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Hanya menerima metode POST
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  const { username, password } = req.body;

  // Validasi input
  if (!username || !password) {
    console.log("EMAIL DAN PASSWORD YANG DIMASUKKAN = " + username + " " + password);
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    // Cari user berdasarkan email
    const user = await prisma.user.findUnique({
      where: { username: username },
    });

    console.log("USER YANG DITEMUKAN" + user);

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Hash password yang diberikan dan bandingkan dengan password yang tersimpan
    const hashedPassword = hashPassword(password);
    if (hashedPassword !== user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Login berhasil, kembalikan informasi user (tanpa token)
    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.log("Error logging in:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
