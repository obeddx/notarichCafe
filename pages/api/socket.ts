import { Server } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";
import { Server as NetServer } from "http";
import type { Socket as NetSocket } from "net";

type SocketServer = NetServer & { io?: Server };
type SocketWithIO = NetSocket & { server: SocketServer };

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (res.socket) {
    const socket = res.socket as SocketWithIO;

    if (!socket.server.io) {
      console.log("🟢 Menginisialisasi WebSocket...");

      const io = new Server(socket.server, {
        path: "/api/socket", // Path untuk koneksi WebSocket
        transports: ["websocket"], // Prioritaskan WebSocket
        cors: {
          origin: "*",
          methods: ["GET", "POST"],
        },
      });

      socket.server.io = io;

      io.on("connection", (socket) => {
        console.log(`✅ Client terhubung: ${socket.id}`);

        socket.on("new-order", (order) => {
          console.log("📦 Pesanan baru diterima:", order);
          io.emit("new-order", order);
        });

        socket.on("order-updated", (updatedOrder) => {
          console.log("🔄 Pesanan diperbarui:", updatedOrder);
          io.emit("order-updated", updatedOrder);
        });

        socket.on("order-deleted", (orderId) => {
          console.log("🗑️ Pesanan dihapus:", orderId);
          io.emit("order-deleted", orderId);
        });

        socket.on("error", (error) => {
          console.error("❌ Error pada koneksi WebSocket:", error);
        });
        
        socket.on("disconnect", (reason) => {
          console.log(`❌ Client terputus: ${socket.id} karena ${reason}`);
        });
      });

      console.log("✅ WebSocket Server berhasil diinisialisasi.");
    } else {
      console.log("⚠️ WebSocket sudah berjalan.");
    }
  } else {
    console.log("❌ res.socket tidak tersedia.");
  }

  res.end();
}