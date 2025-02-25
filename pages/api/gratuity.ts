// pages/api/tax/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const gratuities = await prisma.gratuity.findMany();
      res.status(200).json(gratuities);
    } catch (error) {
      console.error('Error fetching taxes:', error);
      res.status(500).json({ error: 'Failed to fetch taxes' });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'POST') {
    try {
      const { name, value, isActive } = req.body;
      // Buat record tax baru
      const newGratuty = await prisma.gratuity.create({
        data: {
          name,
          value: Number(value),
          isActive: isActive !== undefined ? isActive : true,
        },
      });
      res.status(201).json(newGratuty);
    } catch (error) {
      console.error('Error creating tax:', error);
      res.status(500).json({ error: 'Failed to create tax' });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
