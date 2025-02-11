// pages/api/register.ts

import type { NextApiRequest, NextApiResponse } from "next";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Hanya method POST yang diizinkan
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  // Ambil data dari body request
  const { username, email, password } = req.body;

  // Validasi field yang wajib diisi
  if (!username || !email || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Validasi format email secara sederhana
  const emailRegex = /\S+@\S+\.\S+/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email address" });
  }

  try {
    // Cek apakah user dengan email yang sama sudah ada di database
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    // Hash password menggunakan argon2
    const hashedPassword = await argon2.hash(password);

    // Buat user baru di database
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    // Hilangkan field password dari response
    const { password: _removed, ...userWithoutPassword } = newUser;

    return res.status(201).json({
      message: "User registered successfully",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error during registration:", error);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
}
