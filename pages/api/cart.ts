import type { NextApiRequest, NextApiResponse } from "next";

interface Modifier {
  id: number;
  name: string;
  price: number;
  category: {
    id: number;
    name: string;
  };
}

interface Menu {
  id: number;
  name: string;
  price: number;
  image: string;
  discounts: { discount: { id: number; name: string; type: "PERCENTAGE" | "NORMAL"; scope: "MENU" | "TOTAL"; value: number; isActive: boolean } }[];
  modifiers: { modifier: Modifier }[];
}

interface CartItem {
  menu: Menu;
  quantity: number;
  note: string;
  modifierIds: { [categoryId: number]: number | null };
  uniqueKey: string;
}

let cartData: {
  cartItems: CartItem[];
  cashGiven: number;
  change: number;
  selectedDiscountId: number | null; // Tambahkan ini
} = { cartItems: [], cashGiven: 0, change: 0, selectedDiscountId: null };

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { cartItems, cashGiven, change, selectedDiscountId } = req.body;
    cartData = {
      cartItems: cartItems || cartData.cartItems,
      cashGiven: cashGiven !== undefined ? Number(cashGiven) : cartData.cashGiven,
      change: change !== undefined ? Number(change) : cartData.change,
      selectedDiscountId: selectedDiscountId !== undefined ? selectedDiscountId : cartData.selectedDiscountId,
    };
    res.status(200).json({ message: "Cart updated", ...cartData });
  } else if (req.method === "GET") {
    res.status(200).json(cartData);
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}