// pages/api/supplier/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing supplier id' });
  }
  const supplierId = Number(Array.isArray(id) ? id[0] : id);

  if (req.method === 'DELETE') {
    try {
      // Soft delete: update isActive menjadi false
      const updateSupplier = await prisma.supplier.update({
        where: { id: supplierId },
        data: { isActive: false },
      });
      res.status(200).json(updateSupplier);
    } catch (error) {
      console.error('Error deleting supplier:', error);
      res.status(500).json({ error: 'Failed to delete supplier' });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'PUT') {
    try {
      const updateSupplier = await prisma.supplier.update({
        where: { id: supplierId },
        data: req.body,
      });
      res.status(200).json(updateSupplier);
    } catch (error) {
      console.error('Error updating supplier:', error);
      res.status(500).json({ error: 'Failed to update supplier' });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.setHeader('Allow', ['DELETE', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
