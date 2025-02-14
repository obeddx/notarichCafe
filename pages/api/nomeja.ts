import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // GET: Mengambil data nomor meja dari database
  if (req.method === 'GET') {
    try {
      const dataMeja = await prisma.dataMeja.findMany({
        select: {
          nomorMeja: true,
        },
      });
      res.status(200).json(dataMeja);
    } catch (error) {
      console.error('Error fetching data:', error);
      res.status(500).json({
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

      // Konversi tableNumber menjadi number karena field di database bertipe Int
      const nomorMeja = Number(tableNumber);
      if (isNaN(nomorMeja)) {
        return res.status(400).json({ message: 'tableNumber must be a valid number' });
      }

      const newDataMeja = await prisma.dataMeja.create({
        data: {
          nomorMeja,
        },
      });
      res.status(201).json(newDataMeja);
    } catch (error) {
      console.error('Error creating data:', error);
      res.status(500).json({
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

      // Hapus data meja
      await prisma.dataMeja.deleteMany({
        where: {
          nomorMeja: parsedNomorMeja
        }
      });

      res.status(200).json({ message: 'Meja berhasil direset' });
    } catch (error) {
      console.error('Error deleting table:', error);
      res.status(500).json({
        message: 'Gagal mereset meja',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  // Jika method tidak didukung
  else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }

}
