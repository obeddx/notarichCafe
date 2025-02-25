"use client";

import { useEffect, useState } from "react";

interface CartItem {
  menu: {
    id: number;
    name: string;
    price: number;
    image: string;
  };
  quantity: number;
  note: string;
}

export default function CustomerOrderDisplay() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const fetchCartItems = async () => {
    try {
      const response = await fetch("/api/cart");
      if (!response.ok) throw new Error("Failed to fetch cart items");
      const data = await response.json();
      setCartItems(data.cartItems || []);
    } catch (error) {
      console.error("Error fetching cart items:", error);
    }
  };

  useEffect(() => {
    fetchCartItems();
    const interval = setInterval(fetchCartItems, 2000);
    return () => clearInterval(interval);
  }, []);

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + item.menu.price * item.quantity, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFFAF0] to-[#FFE4C4] p-6 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-[#0E0E0E]">🛒 Pesanan Anda</h1>
        {cartItems.length === 0 ? (
          <p className="text-center text-[#979797]">Belum ada item di pesanan Anda.</p>
        ) : (
          <div className="space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.menu.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={item.menu.image}
                    alt={item.menu.name}
                    className="w-16 h-16 object-cover rounded-full"
                  />
                  <div>
                    <h3 className="font-semibold">{item.menu.name}</h3>
                    <p className="text-sm text-gray-600">Jumlah: {item.quantity}</p>
                    {item.note && (
                      <p className="text-sm text-gray-500">Catatan: {item.note}</p>
                    )}
                  </div>
                </div>
                <p className="text-lg font-semibold">
                  Rp {(item.menu.price * item.quantity).toLocaleString()}
                </p>
              </div>
            ))}
            <div className="mt-6 border-t pt-4">
              <h2 className="text-xl font-bold text-right">
                Total: Rp {calculateTotal().toLocaleString()}
              </h2>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}