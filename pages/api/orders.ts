import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

/**
 * Fungsi helper untuk mengagregasi orderItems.
 *
 * Jika order item berasal dari bundle:
 *  - Kelompokkan berdasarkan bundle.id sehingga hanya satu entri yang dikembalikan.
 *  - Ambil quantity dari baris pertama (untuk menghindari double count).
 *  - Kumpulkan daftar nama menu yang ada di dalam bundle (misalnya, di properti menus).
 *  - Sertakan properti `menu` yang berisi { image, name } dari data bundle.
 *
 * Jika order item bukan bundle:
 *  - Kelompokkan berdasarkan menu.id secara normal.
 */
function aggregateOrderItems(orderItems: any[]): any[] {
  const aggregated = new Map<string, any>();

  for (const item of orderItems) {
    if (item.bundle) {
      // Jika item merupakan bagian dari bundle
      const key = `bundle_${item.bundle.id}`;
      if (!aggregated.has(key)) {
        aggregated.set(key, {
          type: "bundle",
          bundleId: item.bundle.id,
          bundleName: item.bundle.name,
          bundlePrice: item.bundle.bundlePrice,
          quantity: item.quantity, // ambil quantity dari baris pertama
          menus: [item.menu.name],
          image: item.bundle.image || "/images/default_bundle.png",
          // Tambahkan properti menu sehingga komponen UI tetap bisa mengakses item.menu.image dan item.menu.name
          menu: { image: item.bundle.image || "/images/default_bundle.png", name: item.bundle.name },
        });
      } else {
        const agg = aggregated.get(key);
        // Jangan menambahkan quantity lagi agar tidak double count
        if (!agg.menus.includes(item.menu.name)) {
          agg.menus.push(item.menu.name);
        }
      }
    } else {
      // Untuk item biasa (non-bundle)
      const key = `menu_${item.menu.id}`;
      if (!aggregated.has(key)) {
        aggregated.set(key, {
          type: "menu",
          menuId: item.menu.id,
          menuName: item.menu.name,
          price: item.menu.price,
          quantity: item.quantity,
          image: item.menu.image || "/images/default_menu.png",
          // Pastikan properti menu ada agar komponen UI dapat mengakses image dan name
          menu: { image: item.menu.image || "/images/default_menu.png", name: item.menu.name },
        });
      } else {
        const agg = aggregated.get(key);
        agg.quantity += item.quantity;
      }
    }
  }

  return Array.from(aggregated.values());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      // Ambil orders beserta orderItems dengan include data menu dan bundle
      const ordersRaw = await prisma.order.findMany({
        include: { 
          orderItems: {
            include: {
              menu: true,
              bundle: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Untuk tiap order, ganti orderItems dengan hasil agregasi
      const orders = ordersRaw.map(order => ({
        ...order,
        orderItems: aggregateOrderItems(order.orderItems),
      }));

      res.status(200).json({ success: true, orders });
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  } else if (req.method === "PUT") {
    const { orderId, paymentMethod, paymentId } = req.body;

    if (!orderId || !paymentMethod) {
      return res.status(400).json({ message: "Order ID dan metode pembayaran wajib diisi" });
    }

    try {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentMethod,
          paymentId: paymentMethod !== "tunai" ? paymentId : null,
          status: "Sedang Diproses",
        },
      });

      res.status(200).json({ success: true, order: updatedOrder });
    } catch (error) {
      console.error("Gagal mengonfirmasi pembayaran:", error);
      res.status(500).json({ message: "Gagal mengonfirmasi pembayaran" });
    }
  } else {
    res.status(405).json({ message: "Method tidak diizinkan" });
  }
}
