import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Hanya izinkan metode POST
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { userToken, role } = req.body;

  // Validasi input
  if (!userToken || !role) {
    return res.status(400).json({ message: "userToken and role are required" });
  }

  try {
    // Jika role adalah "owner", cari di tabel Owner
    if (role.toLowerCase() === "owner") {
      const owner = await prisma.owner.findUnique({
        where: { token: userToken },
      });

      if (!owner) {
        return res.status(404).json({ message: "User not found" });
      }

      // Untuk owner, validasi role secara sederhana (defaultnya sudah di-set)
      if (owner.role.toLowerCase() !== role.toLowerCase()) {
        return res.status(403).json({ message: "Forbidden: Role mismatch" });
      }

      return res.status(200).json({ message: "Authorized", user: owner });
    }

    // Untuk role lainnya, gunakan query di tabel User
    const user = await prisma.user.findUnique({
      where: { token: userToken },
      include: { role: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.role || user.role.name !== role) {
      return res.status(403).json({ message: "Forbidden: Role mismatch" });
    }

    return res.status(200).json({ message: "Authorized", user });
  } catch (error) {
    console.error("Validation error:", error);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
}
