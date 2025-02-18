import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GET: Jika query parameter type=order-status, ambil status dari database order
  if (req.method === 'GET' && req.query.type === 'order-status') {
    try {
      const orderStatuses = await prisma.order.findMany({
        select: {
          tableNumber: true,
          status: true,
        },
      });
      return res.status(200).json(orderStatuses);
    } catch (error) {
      console.error('Error fetching order statuses:', error);
      return res.status(500).json({
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  // GET: Mengambil data nomor meja dari database (default jika tidak ada query type)
  if (req.method === 'GET') {
    try {
      const dataMeja = await prisma.dataMeja.findMany({
        select: {
          nomorMeja: true,
        },
      });
      return res.status(200).json(dataMeja);
    } catch (error) {
      console.error('Error fetching data:', error);
      return res.status(500).json({
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  // POST: Menambahkan data nomor meja ke database
  else if (req.method === 'POST') {
    try {
      const { tableNumber } = req.body;
      if (!tableNumber) {
        return res.status(400).json({ message: 'tableNumber is required' });
      }
  
      const nomorMeja = Number(tableNumber);
      if (isNaN(nomorMeja)) {
        return res.status(400).json({ message: 'tableNumber must be a valid number' });
      }
  
      const newDataMeja = await prisma.dataMeja.create({
        data: {
          nomorMeja,
        },
      });
      return res.status(201).json(newDataMeja);
    } catch (error) {
      console.error('Error creating data:', error);
      return res.status(500).json({
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  // DELETE: Menghapus data meja berdasarkan nomor meja
  else if (req.method === 'DELETE') {
    try {
      const { nomorMeja } = req.body;
      
      if (!nomorMeja) {
        return res.status(400).json({ message: 'Nomor meja diperlukan' });
      }
  
      const parsedNomorMeja = Number(nomorMeja);
      if (isNaN(parsedNomorMeja)) {
        return res.status(400).json({ message: 'Nomor meja harus berupa angka' });
      }
  
      await prisma.dataMeja.deleteMany({
        where: {
          nomorMeja: parsedNomorMeja
        }
      });
  
      return res.status(200).json({ message: 'Meja berhasil direset' });
    } catch (error) {
      console.error('Error deleting table:', error);
      return res.status(500).json({
        message: 'Gagal mereset meja',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  // Jika method tidak didukung
  else {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
}
