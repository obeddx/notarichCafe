import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { username, email, password, role, token } = req.body;

  try {
    // Hash password
    const hashedPassword = await argon2.hash(password);

    // Simpan data pengguna ke database
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role,
        token, // Simpan token di database
      },
    });

    return res.status(201).json({ message: "Registrasi berhasil", user });
  } catch (error) {
    console.error("Error during registration:", error);
    return res.status(500).json({ message: "Terjadi kesalahan, coba lagi nanti" });
  } finally {
    await prisma.$disconnect();
  }
}