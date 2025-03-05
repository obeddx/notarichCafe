import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Ambil token & manualToken
  const { username, email, password, role, token, manualToken } = req.body;
  // Gabungkan token: pakai token dari URL jika ada,
  // jika tidak ada maka pakai manualToken
  const finalToken = token || manualToken;

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
        token: finalToken, // Simpan token (invite token atau manual token)
      },
    });

    return res.status(201).json({ message: "Registrasi berhasil", user, role });
  } catch (error: any) {
    console.error("Error during registration:", error);

    // Contoh penanganan error unik (misal username/email sudah terpakai)
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Email atau username sudah digunakan" });
    }

    return res.status(500).json({ message: error.message || "Terjadi kesalahan, coba lagi nanti" });
  } finally {
    await prisma.$disconnect();
  }
}
