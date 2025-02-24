import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const taxes = await prisma.tax.findMany();
      res.status(200).json(taxes);
    } catch (error) {
      console.error("Error fetching taxes:", error);
      res.status(500).json({ message: "Failed to fetch taxes" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}