import { Server as HttpServer } from "http";
import { Server as IOServer } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Socket as NetSocket } from "net";

interface CustomSocket extends NetSocket {
  server: HttpServer & { io?: IOServer };
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!res.socket) {
    console.error("Socket is not available on the response object");
    return res.status(500).json({ message: "Socket is not available" });
  }

  const socket = res.socket as CustomSocket;

  if (!socket.server.io) {
    console.log("Initializing WebSocket server...");

    const io = new IOServer(socket.server, {
      path: "/api/socket",
    });
    socket.server.io = io;

    io.on("connection", (socket) => {
      console.log("New client connected:", socket.id);

      // Tangani event dari klien atau API
      socket.on("reservationAdded", (newReservasi) => {
        io.emit("reservationAdded", newReservasi); // Sebarkan ke semua klien
      });

      socket.on("reservationUpdated", (updatedReservasi) => {
        io.emit("reservationUpdated", updatedReservasi); // Sebarkan ke semua klien
      });

      socket.on("reservationDeleted", ({ reservasiId, orderIds }) => {
        io.emit("reservationDeleted", { reservasiId, orderIds }); // Sebarkan ke semua klien
      });

      socket.on("ordersUpdated", (data) => {
        io.emit("ordersUpdated", data); // Sebarkan ke semua klien
      });

      socket.on("paymentStatusUpdated", (updatedOrder) => {
        io.emit("paymentStatusUpdated", updatedOrder); // Sebarkan ke semua klien
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });

    console.log("WebSocket server initialized successfully");
  } else {
    console.log("WebSocket server already initialized");
  }

  res.end();
}

export const config = {
  api: {
    bodyParser: false,
  },
};