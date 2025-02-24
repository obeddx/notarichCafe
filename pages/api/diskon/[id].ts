// pages/api/discount/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing discount id' });
  }
  const discountId = Number(Array.isArray(id) ? id[0] : id);

  if (req.method === 'DELETE') {
    try {
      // Soft delete: update isActive menjadi false
      const updatedDiscount = await prisma.discount.update({
        where: { id: discountId },
        data: { isActive: false },
      });
      res.status(200).json(updatedDiscount);
    } catch (error) {
      console.error('Error deleting discount:', error);
      res.status(500).json({ error: 'Failed to delete discount' });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'PUT') {
    try {
      const updatedDiscount = await prisma.discount.update({
        where: { id: discountId },
        data: req.body,
      });
      res.status(200).json(updatedDiscount);
    } catch (error) {
      console.error('Error updating discount:', error);
      res.status(500).json({ error: 'Failed to update discount' });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.setHeader('Allow', ['DELETE', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
