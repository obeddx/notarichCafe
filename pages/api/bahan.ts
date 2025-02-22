import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      // Ambil ingredient aktif beserta data harga (unitPrice dan price) yang aktif
      const ingredients = await prisma.ingredient.findMany({
        where: { isActive: true },
        
          
        }); 
      
      return res.status(200).json(ingredients);
    } catch (error) {
      console.error("Error fetching ingredients:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  } else {
    return res.status(405).json({ message: "Method not allowed" });
  }
}
