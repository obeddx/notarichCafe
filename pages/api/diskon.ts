// pages/api/discount/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const discounts = await prisma.discount.findMany();
      res.status(200).json(discounts);
    } catch (error) {
      console.error('Error fetching discounts:', error);
      res.status(500).json({ error: 'Failed to fetch discounts' });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'POST') {
    try {
      const { name, type, scope, value, isActive } = req.body;
      // Buat record discount baru
      const newDiscount = await prisma.discount.create({
        data: {
          name,
          type,
          scope,
          value: Number(value),
          isActive: isActive !== undefined ? isActive : true,
        },
      });
      res.status(201).json(newDiscount);
    } catch (error) {
      console.error('Error creating discount:', error);
      res.status(500).json({ error: 'Failed to create discount' });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
