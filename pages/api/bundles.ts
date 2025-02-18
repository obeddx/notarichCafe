import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const bundles = await prisma.bundle.findMany({
      where: {
        isActive: true, // Menambahkan kondisi untuk hanya mengambil bundle yang aktif
      },
      include: {
        bundleMenus: {
          include: {
            menu: true, // Mengambil data menu yang terkait dengan bundle
          },
        },
      },
    });
    
    res.status(200).json(bundles);
  } catch (error) {
    console.error("Error fetching bundles:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    await prisma.$disconnect();
  }
}
