import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, MenuType } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Hanya menerima GET request
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Ambil data menu dengan type BUNDLE dan sertakan data bundleCompositions (dengan detail menu)
    const bundles = await prisma.menu.findMany({
      where: { type: MenuType.BUNDLE },
      include: {
        bundleCompositions: {
          include: {
            menu: true, // sertakan detail menu yang masuk ke dalam bundle
          },
        },
      },
    });

    return res.status(200).json(bundles);
  } catch (error) {
    console.error("Error retrieving bundles:", error);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
}
