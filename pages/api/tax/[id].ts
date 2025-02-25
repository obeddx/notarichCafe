// pages/api/tax/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing tax id' });
  }
  const taxId = Number(Array.isArray(id) ? id[0] : id);

  if (req.method === 'DELETE') {
    try {
      // Soft delete: update isActive menjadi false
      const updatedTax = await prisma.tax.update({
        where: { id: taxId },
        data: { isActive: false },
      });
      res.status(200).json(updatedTax);
    } catch (error) {
      console.error('Error deleting tax:', error);
      res.status(500).json({ error: 'Failed to delete tax' });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'PUT') {
    try {
      const updatedTax = await prisma.tax.update({
        where: { id: taxId },
        data: req.body,
      });
      res.status(200).json(updatedTax);
    } catch (error) {
      console.error('Error updating tax:', error);
      res.status(500).json({ error: 'Failed to update tax' });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.setHeader('Allow', ['DELETE', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
