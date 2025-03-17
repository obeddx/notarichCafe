// pages/api/register.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Tambahkan log awal untuk melihat method dan body
  console.log("===== /api/register START =====");
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

    // Token final (untuk di-store, jika diperlukan)
    const finalToken = token || manualToken;

    let roleId: number | null = null;
    let finalEmail = email;

    // 1. Cek Invite Flow
    if (token) {
      console.log(">>> Invite Flow Detected");
      // Cari employee berdasarkan inviteToken
      const employee = await prisma.employee.findFirst({
        where: { inviteToken: token },
        include: { role: true },
      });
      console.log("Found employee:", employee);

      if (!employee) {
        console.log("Invalid or expired token - employee not found");
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      // Cek apakah token sudah expired
      if (employee.inviteExpiresAt && employee.inviteExpiresAt < new Date()) {
        console.log("Invite token expired");
        return res.status(400).json({ message: "Invite token expired" });
      }

      // Gunakan roleId & email dari employee
      roleId = employee.roleId;
      finalEmail = employee.email;
      console.log("Using roleId from employee:", roleId);
      console.log("Using email from employee:", finalEmail);
    } else {
      console.log(">>> Non-invite Flow");
      // 2. Cari role berdasarkan nama (role) yang dikirim user
      const roleData = await prisma.roleEmployee.findFirst({
        where: { name: role },
      });
      console.log("Found roleData:", roleData);

      if (!roleData) {
        console.log("Role tidak valid");
        return res.status(400).json({ message: "Role tidak valid" });
      }
      roleId = roleData.id;
    }

    // Validasi minimal
    if (!username || !finalEmail || !password || !roleId) {
      console.log("Invalid input data (username, email, password, roleId)");
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    // 3. Hash password
    console.log("Hashing password...");
    const hashedPassword = await argon2.hash(password);

    // 4. Buat user di tabel User
    console.log("Creating user in DB...");
    const user = await prisma.user.create({
      data: {
        username,
        email: finalEmail,
        password: hashedPassword,
        roleId,
        token: finalToken,
      },
    });

    console.log("User created successfully:", user);

    // Beri respons sukses
    return res.status(201).json({ message: "Registrasi berhasil", user, role });
  } catch (error: any) {
    console.error("Error during registration:", error);

    // Tangani error unik (email/username duplikat)
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Email atau username sudah digunakan" });
    }

    return res.status(500).json({ message: error.message || "Terjadi kesalahan, coba lagi nanti" });
  } finally {
    console.log("===== /api/register END =====");
    await prisma.$disconnect();
  }
}
