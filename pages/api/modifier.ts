import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case "GET":
      try {
        const modifiers = await prisma.modifier.findMany({
          include: {
            ingredients: { include: { ingredient: true } },
            category: true, // Sertakan kategori
          },
        });
        res.status(200).json(modifiers);
      } catch (error) {
        console.error("Error fetching modifiers:", error);
        res.status(500).json({ message: "Failed to fetch modifiers", error });
      }
      break;

    case "POST":
      try {
        const { name, price, categoryId, ingredients } = req.body;
        if (!name || !categoryId) {
          return res.status(400).json({ message: "Name and Category ID are required" });
        }
        const modifier = await prisma.modifier.create({
          data: {
            name,
            price: price ? parseFloat(price) : 0,
            categoryId: Number(categoryId),
            ingredients: {
              create: ingredients.map((ing: { ingredientId: number; amount: number }) => ({
                ingredientId: ing.ingredientId,
                amount: ing.amount,
              })),
            },
          },
          include: {
            ingredients: { include: { ingredient: true } },
            category: true,
          },
        });
        res.status(201).json(modifier);
      } catch (error) {
        console.error("Error creating modifier:", error);
        res.status(500).json({ message: "Failed to create modifier", error });
      }
      break;

    case "PUT":
      try {
        const { id, name, price, categoryId, ingredients } = req.body;
        if (!id || !name || !categoryId) {
          return res.status(400).json({ message: "ID, Name, and Category ID are required" });
        }
        await prisma.modifierIngredient.deleteMany({
          where: { modifierId: Number(id) },
        });
        const modifier = await prisma.modifier.update({
          where: { id: Number(id) },
          data: {
            name,
            price: price ? parseFloat(price) : 0,
            categoryId: Number(categoryId),
            ingredients: {
              create: ingredients.map((ing: { ingredientId: number; amount: number }) => ({
                ingredientId: ing.ingredientId,
                amount: ing.amount,
              })),
            },
          },
          include: {
            ingredients: { include: { ingredient: true } },
            category: true,
          },
        });
        res.status(200).json(modifier);
      } catch (error) {
        console.error("Error updating modifier:", error);
        res.status(500).json({ message: "Failed to update modifier", error });
      }
      break;

    case "DELETE":
      try {
        const { id } = req.query;
        if (!id) {
          return res.status(400).json({ message: "ID is required" });
        }
        await prisma.modifier.delete({
          where: { id: Number(id) },
        });
        res.status(204).end();
      } catch (error) {
        console.error("Error deleting modifier:", error);
        res.status(500).json({ message: "Failed to delete modifier", error });
      }
      break;

    default:
      res.status(405).json({ message: "Method not allowed" });
      break;
  }
}