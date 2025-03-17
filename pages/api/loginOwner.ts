import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  const { username, password } = req.body;

  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "Username and password must be strings." });
  }

  try {
    // Cari owner berdasarkan username
    const owner = await prisma.owner.findUnique({
      where: { username },
    });

    if (!owner) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Verifikasi password menggunakan argon2
    const isPasswordValid = await argon2.verify(owner.password, password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Pastikan owner memiliki token (token bisa dibuat saat pembuatan akun owner)
    if (!owner.token) {
      return res.status(500).json({ message: "Owner token is not defined." });
    }

    // Hanya set flag Secure jika di environment production
    const isProduction = process.env.NODE_ENV === "production";

    res.setHeader("Set-Cookie", `owner=${encodeURIComponent(owner.token)}; Path=/; HttpOnly;${isProduction ? " Secure;" : ""} SameSite=Strict; Max-Age=86400`);

    // Respons sukses dengan data owner dan role statis "owner"
    return res.status(200).json({
      message: "Login successful",
      owner: {
        id: owner.id,
        username: owner.username,
        email: owner.email,
        role: owner.role, // Nilai statis "owner"
      },
    });
  } catch (error) {
    console.error("Error logging in owner:", error);
    return res.status(500).json({ message: "An error occurred during login." });
  } finally {
    await prisma.$disconnect();
  }
}
