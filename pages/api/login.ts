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

  // Validasi input
  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "Username and password must be strings." });
  }

  try {
    // Cari pengguna berdasarkan username dan sertakan relasi role
    const user = await prisma.user.findUnique({
      where: { username },
      include: { role: true },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Verifikasi password
    const isPasswordValid = await argon2.verify(user.password, password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Pastikan role ada (tanpa membatasi ke nilai tertentu)
    if (!user.role) {
      return res.status(500).json({ message: "User role is not defined." });
    }

    const roleCookie = user.role.name.toLowerCase();

    // Set cookie dengan token user
    res.setHeader("Set-Cookie", `${roleCookie}=${encodeURIComponent(user.token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`);

    // Respons sukses
    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.name,
      },
    });
  } catch (error) {
    console.error("Error logging in:", error);
    return res.status(500).json({ message: "An error occurred during login." });
  } finally {
    await prisma.$disconnect();
  }
}
