import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const gratuities = await prisma.gratuity.findMany();
      res.status(200).json(gratuities);
    } catch (error) {
      console.error("Error fetching gratuities:", error);
      res.status(500).json({ message: "Failed to fetch gratuities" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}