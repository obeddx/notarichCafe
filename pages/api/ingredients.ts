import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const ingredients = await prisma.ingredient.findMany({
        select: {
          id: true,
          name: true,
        },
      });
      res.status(200).json(ingredients);
    } catch (error) {
      console.error("Error fetching ingredients:", error);
      res.status(500).json({ message: "Failed to fetch ingredients", error });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}