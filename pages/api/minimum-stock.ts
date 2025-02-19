// File: pages/api/minimum-stock.ts

import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Jika tidak dikirim, default operator = "lt" dan threshold = 20
    const operator = (req.query.operator as string) || "lt";
    const threshold = req.query.threshold ? Number(req.query.threshold) : 20;

    if (isNaN(threshold)) {
      return res.status(400).json({ error: "Invalid threshold" });
    }

    let condition = {};
    if (operator === "lt") {
      condition = { stock: { lt: threshold } };
    } else if (operator === "gt") {
      condition = { stock: { gt: threshold } };
    } else {
      return res.status(400).json({ error: "Invalid operator. Use 'lt' or 'gt'" });
    }

    const ingredients = await prisma.ingredient.findMany({
      where: condition,
      select: {
        id: true,
        name: true,
        stock: true,
        stockMin: true,
        unit: true,
      },
    });

    res.status(200).json(ingredients);
  } catch (error) {
    console.error("Error fetching minimum stock:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
