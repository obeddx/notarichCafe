// pages/api/registerOwner.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("===== /api/registerOwner START =====");
  console.log("Method:", req.method);
  console.log("Body Received:", req.body);

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Ambil field dari body
    const { username, email, password, role, token, manualToken } = req.body;
    console.log("Parsed fields:");
    console.log("username:", username);
    console.log("email:", email);
    console.log("password:", password);
    console.log("role:", role);
    console.log("token:", token);
    console.log("manualToken:", manualToken);

    // Token final yang akan disimpan (otomatis di-generate di frontend)
    const finalToken = token || manualToken;

    // Validasi input minimal
    if (!username || !email || !password) {
      console.log("Invalid input data (username, email, password)");
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    // Jika field role dikirim, pastikan nilainya sesuai (harus "owner")
    if (role && role.toLowerCase() !== "owner") {
      console.log("Role provided is not valid for owner registration");
      return res.status(400).json({ message: "Role tidak valid untuk owner" });
    }

    // Hash password menggunakan argon2
    console.log("Hashing password...");
    const hashedPassword = await argon2.hash(password);

    // Buat record owner di database
    console.log("Creating owner in DB...");
    const owner = await prisma.owner.create({
      data: {
        username,
        email,
        password: hashedPassword,
        token: finalToken,
        // Field role tidak perlu dikirim karena default di schema adalah "owner"
      },
    });

    console.log("Owner created successfully:", owner);

    // Beri respons sukses
    return res.status(201).json({ message: "Registrasi owner berhasil", owner });
  } catch (error: any) {
    console.error("Error during owner registration:", error);

    // Tangani error unik duplikat (email/username sudah digunakan)
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Email atau username sudah digunakan" });
    }

    return res.status(500).json({ message: error.message || "Terjadi kesalahan, coba lagi nanti" });
  } finally {
    console.log("===== /api/registerOwner END =====");
    await prisma.$disconnect();
  }
}
