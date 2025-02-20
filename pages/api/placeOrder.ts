import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import type { Server as SocketServer } from "socket.io";

const prisma = new PrismaClient();

interface OrderDetails {
  tableNumber: string;
  items: any[]; // disesuaikan dengan struktur data yang dikirim
  total: number;
  customerName: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const orderDetails: OrderDetails = req.body;
    console.log("orderDetails:", orderDetails);

    // Validasi data order
    if (
      !orderDetails.tableNumber ||
      !orderDetails.items ||
      orderDetails.items.length === 0 ||
      !orderDetails.total
    ) {
      return res.status(400).json({ message: "Invalid order data" });
    }

    // Mapping data cart ke OrderItem
    // Jika terdapat properti menuId maka dianggap item menu,
    // sedangkan jika terdapat bundleId maka dianggap item bundle.
    // Untuk item bundle, pastikan data juga menyertakan array bundleMenus.
    const orderItemsData = orderDetails.items.flatMap((cartItem: any) => {
      if (cartItem.menuId) {
        return [
          {
            menuId: cartItem.menuId,
            quantity: cartItem.quantity,
            note: cartItem.note || "",
          },
        ];
      } else if (cartItem.bundleId) {
        if (cartItem.bundleMenus && Array.isArray(cartItem.bundleMenus)) {
          return cartItem.bundleMenus.map((bm: any) => ({
            menuId: bm.menuId,
            quantity: bm.quantity * cartItem.quantity,
            note: cartItem.note || "",
            bundleId: cartItem.bundleId,
          }));
        } else {
          console.warn(
            "Bundle item dengan bundleId",
            cartItem.bundleId,
            "tidak memiliki properti bundleMenus"
          );
          return [];
        }
      }
      return [];
    });
    
    console.log("orderItemsData:", orderItemsData);

    if (orderItemsData.length === 0) {
      return res.status(400).json({ message: "No valid order items found" });
    }

    // --- VALIDASI GLOBAL STOK BAHAN ---
    // 1. Hitung total quantity untuk tiap menuId yang dipesan
    const orderQuantities: { [menuId: number]: number } = {};
    for (const item of orderItemsData) {
      orderQuantities[item.menuId] = (orderQuantities[item.menuId] || 0) + item.quantity;
    }

    // 2. Ambil seluruh data menuIngredient untuk menu-menu yang dipesan
    const menuIds = Object.keys(orderQuantities).map(Number);
    const menuIngredients = await prisma.menuIngredient.findMany({
      where: { menuId: { in: menuIds } },
    });

    // 3. Akumulasi total kebutuhan tiap ingredient
    const orderRequirements: { [ingredientId: number]: number } = {};
    for (const mi of menuIngredients) {
      const quantityOrdered = orderQuantities[mi.menuId] || 0;
      const required = mi.amount * quantityOrdered;
      orderRequirements[mi.ingredientId] = (orderRequirements[mi.ingredientId] || 0) + required;
    }

   // 4. Cek stok setiap ingredient
// 4. Cek stok setiap ingredient
for (const ingredientIdStr in orderRequirements) {
  const ingredientId = Number(ingredientIdStr);
  const requiredQty = orderRequirements[ingredientId];

  const ingredient = await prisma.ingredient.findUnique({ where: { id: ingredientId } });
  if (!ingredient) {
    return res.status(400).json({
      message: `Bahan dengan id ${ingredientId} tidak ditemukan.`
    });
  }
  
  if (ingredient.stock < requiredQty) {
    // Cari semua record menuIngredient yang menggunakan bahan ini
    const affectedMenuIngredients = menuIngredients.filter(mi => mi.ingredientId === ingredientId);
    // Dapatkan daftar unik menuId yang menggunakan bahan ini
    const affectedMenuIds = Array.from(new Set(affectedMenuIngredients.map(mi => mi.menuId)));

    const affectedMenuOptions: string[] = [];
    // Untuk setiap menu, hitung berapa banyak porsi menu yang dapat dibuat dengan stok yang tersisa
    for (const menuId of affectedMenuIds) {
      // Ambil salah satu record menuIngredient untuk menu tersebut
      const miForMenu = affectedMenuIngredients.find(mi => mi.menuId === menuId);
      if (miForMenu && miForMenu.amount > 0) {
        const possible = Math.floor(ingredient.stock / miForMenu.amount);
        const menuRecord = await prisma.menu.findUnique({ where: { id: menuId } });
        const menuName = menuRecord?.name || `Menu ${menuId}`;
        affectedMenuOptions.push(`${menuName} sebanyak ${possible}`);
      }
    }
    
    // Buat pesan error dengan menyertakan semua opsi yang ditemukan
    const optionsMessage = affectedMenuOptions.join(" atau ");
    return res.status(400).json({
      message1: `Silahkan kurangi jumlah menu. Pilih salah satu: ${optionsMessage}.`
    });
  }
}



    // --- AKHIR VALIDASI GLOBAL STOK BAHAN ---

    // Simpan order ke database
    const newOrder = await prisma.order.create({
      data: {
        customerName: orderDetails.customerName,
        tableNumber: orderDetails.tableNumber,
        total: orderDetails.total,
        status: "pending",
        orderItems: {
          create: orderItemsData,
        },
      },
      include: {
        orderItems: {
          include: {
            menu: true, // sertakan data menu jika diperlukan
          },
        },
      },
    });

    // Kirim notifikasi melalui WebSocket
    const io = (res.socket as any)?.server?.io as SocketServer;
    if (io) {
      io.emit("new-order", newOrder);
    }

    res.status(200).json({
      success: true,
      message: "Order placed successfully",
      order: newOrder,
    });
  } catch (error: any) {
    console.error("Error placing order:", error);
    res.status(500).json({ message: "Failed to place order", error: error.message });
  }
}
