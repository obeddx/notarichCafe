import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === "PUT") {
    try {
      const { status } = req.body;
      const updatedOrder = await prisma.order.update({
        where: { id: Number(id) },
        data: { status },
      });

      res.status(200).json({ success: true, order: updatedOrder });
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
