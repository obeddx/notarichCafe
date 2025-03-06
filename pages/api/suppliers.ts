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
      const suppliers = await prisma.supplier.findMany();
      res.status(200).json(suppliers);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      res.status(500).json({ error: 'Failed to fetch suppliers' });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'POST') {
    try {
      const { name, address, phone, email, isActive } = req.body;
      // Buat record discount baru
      const newSupplier = await prisma.supplier.create({
        data: {
          name,
          address,
          phone,
          email,
          isActive: isActive !== undefined ? isActive : true,
        },
      });
      res.status(201).json(newSupplier);
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
