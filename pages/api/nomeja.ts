// pages/api/nomeja.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET" && req.query.type === "order-status") {
    try {
      const orderStatuses = await prisma.order.findMany({
        select: {
          tableNumber: true,
          status: true,
        },
      });
      return res.status(200).json(orderStatuses);
    } catch (error) {
      console.error("Error fetching order statuses:", error);
      return res.status(500).json({
        message: "Internal Server Error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (req.method === "GET") {
    try {
      const dataMeja = await prisma.dataMeja.findMany({
        select: {
          nomorMeja: true,
          isManuallyMarked: true,
          markedAt: true,
        },
        where: {
          OR: [
            { isManuallyMarked: true }, // Hanya ambil yang benar-benar marked
            { markedAt: { not: null } }, // Pastikan ada timestamp
          ],
        },
      });
      return res.status(200).json(dataMeja);
    } catch (error) {
      console.error("Error fetching data:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  // POST (tetap sama)
  else if (req.method === "POST") {
    try {
      const { tableNumber } = req.body;
      if (!tableNumber) {
        return res.status(400).json({ message: "tableNumber is required" });
      }

      const nomorMeja = Number(tableNumber);
      if (isNaN(nomorMeja)) {
        return res.status(400).json({ message: "tableNumber must be a valid number" });
      }

      const existingTable = await prisma.dataMeja.findFirst({
        where: { nomorMeja },
      });

      if (existingTable) {
        const updatedTable = await prisma.dataMeja.update({
          where: { id: existingTable.id },
          data: {
            isManuallyMarked: true,
            markedAt: new Date(),
          },
        });
        return res.status(200).json(updatedTable);
      } else {
        const newDataMeja = await prisma.dataMeja.create({
          data: {
            nomorMeja,
            isManuallyMarked: true,
            markedAt: new Date(),
          },
        });
        return res.status(201).json(newDataMeja);
      }
    } catch (error) {
      console.error("Error creating/updating data:", error);
      return res.status(500).json({
        message: "Internal Server Error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // DELETE (tetap sama)
  else if (req.method === "DELETE") {
    try {
      const { nomorMeja } = req.body;
      if (!nomorMeja) {
        return res.status(400).json({ message: "Nomor meja diperlukan" });
      }
  
      const parsedNomorMeja = Number(nomorMeja);
      if (isNaN(parsedNomorMeja)) {
        return res.status(400).json({ message: "Nomor meja harus berupa angka" });
      }
  
      const existingTable = await prisma.dataMeja.findFirst({
        where: { nomorMeja: parsedNomorMeja },
      });
  
      if (existingTable) {
        await prisma.dataMeja.update({
          where: { id: existingTable.id },
          data: {
            isManuallyMarked: false,
            markedAt: null,
          },
        });
        return res.status(200).json({ message: "Penandaan meja berhasil direset" });
      } else {
        return res.status(404).json({ message: "Meja tidak ditemukan" });
      }
    } catch (error) {
      console.error("Error resetting table:", error);
      return res.status(500).json({
        message: "Gagal mereset meja",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  else {
    return res.status(405).json({ message: "Method Not Allowed" });
  }
}