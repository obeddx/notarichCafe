import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("===== /api/register START =====");
  console.log("Method:", req.method);
  console.log("Body Received:", req.body);

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { username, email, password, role, inviteToken, userToken } = req.body;
    console.log("Parsed fields:");
    console.log("username:", username);
    console.log("email:", email);
    console.log("password:", password);
    console.log("role:", role);
    console.log("inviteToken:", inviteToken);
    console.log("userToken:", userToken);

    let roleId: number | null = null;
    let finalEmail = email;

    // 1. Cek Invite Flow
    if (inviteToken) {
      console.log(">>> Invite Flow Detected");
      const employee = await prisma.employee.findFirst({
        where: { inviteToken: inviteToken },
        include: { role: true },
      });
      console.log("Found employee:", employee);

      if (!employee) {
        console.log("Invalid or expired token - employee not found");
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      if (employee.inviteExpiresAt && employee.inviteExpiresAt < new Date()) {
        console.log("Invite token expired");
        return res.status(400).json({ message: "Invite token expired" });
      }

      roleId = employee.roleId;
      finalEmail = employee.email;
      console.log("Using roleId from employee:", roleId);
      console.log("Using email from employee:", finalEmail);
    } else {
      console.log(">>> Non-invite Flow");
      if (role) {
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
    }

    // Validasi minimal
    if (!username || !finalEmail || !password) {
      console.log("Invalid input data (username, email, password)");
      return res.status(400).json({ message: "Username, email, dan password wajib diisi" });
    }

    // Validasi token unik (jika ada)
    if (userToken) {
      const existingToken = await prisma.user.findUnique({
        where: { token: userToken },
      });
      if (existingToken) {
        console.log("Token sudah digunakan");
        return res.status(400).json({ message: "Token sudah digunakan" });
      }
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
        token: userToken || null,
      },
    });

    if (!user) {
      console.log("Failed to create user - returned null");
      throw new Error("Gagal membuat user di database");
    }

    console.log("User created successfully:", user);

    // 5. Ambil nama role untuk response (opsional)
    let roleName: string | null = role || "unknown";
    if (roleId) {
      const roleData = await prisma.roleEmployee.findUnique({ where: { id: roleId } });
      roleName = roleData?.name || roleName;
    }

    // Beri respons sukses
    const responsePayload = {
      message: "Registrasi berhasil",
      user,
      role: roleName,
    };
    console.log("Response payload:", responsePayload);
    return res.status(201).json(responsePayload);
  } catch (error: any) {
    console.error("Error during registration:", error);

    if (error.code === "P2002") {
      console.log("Unique constraint failed:", error.meta.target);
      return res.status(400).json({ message: "Email, username, atau token sudah digunakan" });
    }

    const errorMessage = error.message || "Terjadi kesalahan, coba lagi nanti";
    console.log("Returning error response:", errorMessage);
    return res.status(500).json({ message: errorMessage });
  } finally {
    console.log("===== /api/register END =====");
    await prisma.$disconnect();
  }
}
