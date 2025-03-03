// pages/api/verify-invite.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ error: "Token not provided" });
      }

      // 1. Cari employee berdasarkan token
      const employee = await prisma.employee.findFirst({
        where: { inviteToken: token },
      });
      if (!employee) {
        return res.status(404).json({ error: "Invalid token" });
      }

      // 2. Cek apakah token sudah kedaluwarsa
      const now = new Date();
      if (employee.inviteExpiresAt && now > employee.inviteExpiresAt) {
        return res.status(410).json({ error: "Token expired" });
      }

      // 3. Token valid dan belum expired
      return res.status(200).json({ message: "Token valid", employee });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Server Error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
