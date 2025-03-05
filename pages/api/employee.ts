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
  if (req.method === "GET") {
    try {
      const employees = await prisma.employee.findMany({
        include: { role: true },
      });
      return res.status(200).json(employees);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error fetching employees" });
    }
  }

  if (req.method === "POST") {
    try {
      const { firstName, lastName, email, phone, roleId, expiredDate } = req.body;

      // Generate token & set expiry 5 menit (jika Anda masih perlu fitur invite)
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

      // Kirim email invite (opsional)
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

  // Tambahkan handler untuk EDIT (PUT)
  if (req.method === "PUT") {
    try {
      const { id, firstName, lastName, email, phone, roleId, expiredDate } = req.body;

      const updatedEmployee = await prisma.employee.update({
        where: { id: Number(id) },
        data: {
          firstName,
          lastName,
          email,
          phone,
          roleId: Number(roleId),
          expiredDate: new Date(expiredDate),
        },
        include: { role: true },
      });

      return res.status(200).json(updatedEmployee);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error updating employee" });
    }
  }

  // Tambahkan handler untuk DELETE
  if (req.method === "DELETE") {
    try {
      const { id } = req.body;
      await prisma.employee.delete({
        where: { id: Number(id) },
      });
      return res.status(200).json({ message: "Employee deleted successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error deleting employee" });
    }
  }

  // Jika method lain, kembalikan error
  return res.status(405).json({ error: "Method not allowed" });
}
