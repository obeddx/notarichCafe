// pages/api/purchaseOrder.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // Logika untuk mengambil semua purchase order
    try {
      const purchaseOrders = await prisma.purchaseOrder.findMany({
        include: {
          ingredient: true, // Sertakan detail ingredient jika dibutuhkan di sisi klien
        },
        orderBy: {
          createdAt: "desc", // Opsional: Urutkan berdasarkan tanggal pembuatan (terbaru ke terlama)
        },
      });
      return res.status(200).json(purchaseOrders);
    } catch (error) {
      console.error("Error fetching all purchase orders:", error);
      return res.status(500).json({ message: "Error fetching purchase orders" });
    }
  } else if (req.method === "POST") {
    // Ekstrak data dari request body
    const { date, ingredientId, quantity, totalPrice } = req.body;

    // Jika terdapat properti date, lakukan fetch berdasarkan tanggal tersebut
    if (date) {
      // Konversi string date menjadi objek Date dan set jam ke awal hari (00:00:00)
      const selectedDate = new Date(date);
      selectedDate.setHours(0, 0, 0, 0);
      // Tentukan batas akhir hari tersebut
      const nextDate = new Date(selectedDate);
      nextDate.setDate(nextDate.getDate() + 1);

      try {
        const purchaseOrders = await prisma.purchaseOrder.findMany({
          where: {
            createdAt: {
              gte: selectedDate,
              lt: nextDate,
            },
          },
          include: {
            ingredient: true,
          },
        });
        return res.status(200).json(purchaseOrders);
      } catch (error) {
        console.error("Error fetching purchase orders by date:", error);
        return res.status(500).json({ message: "Error fetching purchase orders" });
      }
    }
    // Jika data untuk membuat purchase order tersedia
    else if (ingredientId && quantity && totalPrice) {
      try {
        // Buat purchase order baru
        const newPurchaseOrder = await prisma.purchaseOrder.create({
          data: {
            ingredient: {
              connect: { id: ingredientId },
            },
            quantity,
            totalPrice,
          },
        });

        // Cari record Gudang yang terkait dengan ingredientId tersebut
        const gudangRecord = await prisma.gudang.findUnique({
          where: { ingredientId },
        });

        if (gudangRecord) {
          // Tambah stockIn dengan quantity dari purchase order
          const newStockIn = gudangRecord.stockIn + quantity;
          // Hitung stock baru: stock = start + stockIn - used - wasted
          const newStock = gudangRecord.start + newStockIn - gudangRecord.used - gudangRecord.wasted;

          await prisma.gudang.update({
            where: { ingredientId },
            data: {
              stockIn: newStockIn,
              stock: newStock,
            },
          });
        } else {
          console.warn(`Gudang record not found for ingredientId: ${ingredientId}`);
        }

        // Hitung harga baru
        const newPrice = totalPrice / quantity;

        // Update harga di tabel Ingredient
        await prisma.ingredient.update({
          where: { id: ingredientId },
          data: { price: newPrice },
        });

        return res.status(201).json(newPurchaseOrder);
      } catch (error) {
        console.error("Error creating purchase order:", error);
        return res.status(500).json({ message: "Error creating purchase order" });
      }
    } else {
      return res.status(400).json({ message: "Missing required fields" });
    }
  } else {
    // Jika metode selain GET atau POST
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
}