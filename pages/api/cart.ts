import type { NextApiRequest, NextApiResponse } from "next";

// Temporary in-memory store (note: this resets on server restart)
let cartItems: any[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    // Update cart items from cashier
    cartItems = req.body.cartItems || [];
    res.status(200).json({ message: "Cart updated", cartItems });
  } else if (req.method === "GET") {
    // Return current cart items
    res.status(200).json({ cartItems });
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}