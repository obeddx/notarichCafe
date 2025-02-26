import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case "GET":
      return getModifiers(req, res);
    case "POST":
      return createModifier(req, res);
    case "PUT":
      return updateModifier(req, res);
    case "DELETE":
      return deleteModifier(req, res);
    default:
      return res.status(405).json({ message: "Method not allowed" });
  }
}

async function getModifiers(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { menuId } = req.query;
    const modifiers = await prisma.modifier.findMany({
      where: { menuId: Number(menuId) },
    });
    res.status(200).json(modifiers);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch modifiers", error });
  }
}

async function createModifier(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { modifierName, price, menuId } = req.body;
    const modifier = await prisma.modifier.create({
      data: { modifierName, price, menuId },
    });
    res.status(201).json(modifier);
  } catch (error) {
    res.status(500).json({ message: "Failed to create modifier", error });
  }
}

async function updateModifier(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id, modifierName, price } = req.body;
    const modifier = await prisma.modifier.update({
      where: { id: Number(id) },
      data: { modifierName, price },
    });
    res.status(200).json(modifier);
  } catch (error) {
    res.status(500).json({ message: "Failed to update modifier", error });
  }
}

async function deleteModifier(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    await prisma.modifier.delete({ where: { id: Number(id) } });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: "Failed to delete modifier", error });
  }
}