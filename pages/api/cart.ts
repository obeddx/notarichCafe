import type { NextApiRequest, NextApiResponse } from "next";

let cartData: {
  cartItems: any[];
  cashGiven: number;
  change: number;
} = { cartItems: [], cashGiven: 0, change: 0 };

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { cartItems, cashGiven, change } = req.body;
    cartData = {
      cartItems: cartItems || cartData.cartItems,
      cashGiven: cashGiven !== undefined ? Number(cashGiven) : cartData.cashGiven,
      change: change !== undefined ? Number(change) : cartData.change,
    };
    res.status(200).json({ message: "Cart updated", ...cartData });
  } else if (req.method === "GET") {
    res.status(200).json(cartData);
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}