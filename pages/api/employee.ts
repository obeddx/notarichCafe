// pages/api/employee.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

// 1. Buat transporter Nodemailer di sini
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Masukkan email Gmail Anda
    pass: process.env.EMAIL_PASS, // Masukkan password / App Password Gmail
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

      // 2. Buat employee baru di database (include role agar kita dapat role.name)
      const newEmployee = await prisma.employee.create({
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

      // 3. Kirim email ke user yang di-invite (jika email diisi)
      if (email) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Selamat Datang di Notarich Cafe",
          text: `Halo ${firstName} ${lastName}, selamat datang di keluarga Notarich Cafe dengan job sebagai ${newEmployee.role?.name}.
Silahkan registrasi akunmu di http://localhost:3000/register ya. Terima Kasih!`,
        });
      }

      // 4. Kembalikan data karyawan yang baru ditambahkan
      return res.status(201).json(newEmployee);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error creating employee" });
    }
  }

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
      });
      return res.status(200).json(updatedEmployee);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error updating employee" });
    }
  }

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

  return res.status(405).json({ error: "Method not allowed" });
}
