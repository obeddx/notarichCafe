import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      // Ambil ingredient dengan isActiver == true dari database
      const gudangs = await prisma.gudang.findMany({
        where: { isActive: true }, 
      });
      return res.status(200).json(gudangs);
    } catch (error) {
      console.error("Error fetching ingredients:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  } else {
    return res.status(405).json({ message: "Method not allowed" });
  }
}
