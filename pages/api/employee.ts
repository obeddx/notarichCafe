// pages/api/employee.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import crypto from "crypto";

const prisma = new PrismaClient();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Tambahkan method GET agar Frontend bisa memanggil GET /api/employee
  if (req.method === "GET") {
    try {
      const employees = await prisma.employee.findMany({
        include: { role: true },
      });
      // Pastikan kembalikan array
      return res.status(200).json(employees);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error fetching employees" });
    }
  }

  // 2. Method POST untuk membuat employee baru dengan token & expiry
  if (req.method === "POST") {
    try {
      const { firstName, lastName, email, phone, roleId, expiredDate } = req.body;

      const inviteToken = crypto.randomBytes(16).toString("hex");
      const inviteExpiresAt = new Date();
      inviteExpiresAt.setMinutes(inviteExpiresAt.getMinutes() + 5);

      const newEmployee = await prisma.employee.create({
        data: {
          firstName,
          lastName,
          email,
          phone,
          roleId: Number(roleId),
          expiredDate: new Date(expiredDate),
          inviteToken,
          inviteExpiresAt,
        },
        include: { role: true },
      });

      if (email) {
        const registerLink = `http://localhost:3000/register?token=${inviteToken}`;
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Selamat Datang di Notarich Cafe",
          text: `Halo ${firstName} ${lastName}, selamat datang di keluarga Notarich Cafe dengan job sebagai ${newEmployee.role?.name}.
Silakan registrasi akunmu melalui link berikut (berlaku 5 menit): ${registerLink}.
Terima Kasih!`,
        });
      }

      return res.status(201).json(newEmployee);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error creating employee" });
    }
  }

  // 3. Untuk method PUT / DELETE bisa Anda tambahkan sendiri
  //    jika memang dibutuhkan, misal:

  // if (req.method === "PUT") { ... }
  // if (req.method === "DELETE") { ... }

  // 4. Jika method tidak di-handle, kembalikan error
  return res.status(405).json({ error: "Method not allowed" });
}
