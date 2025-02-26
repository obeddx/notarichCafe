"use client";

import { useEffect, useState } from "react";

interface Menu {
  id: number;
  name: string;
  price: number;
  image: string;
  discounts: { discount: Discount }[];
}

interface Discount {
  id: number;
  name: string;
  type: "PERCENTAGE" | "NORMAL";
  scope: "MENU" | "TOTAL";
  value: number;
  isActive: boolean;
}

interface CartItem {
  menu: Menu;
  quantity: number;
  note: string;
}

interface CartData {
  cartItems: CartItem[];
  cashGiven: number;
  change: number;
}

export default function CustomerOrderDisplay() {
  const [cartData, setCartData] = useState<CartData>({
    cartItems: [],
    cashGiven: 0,
    change: 0,
  });

  const fetchCartItems = async () => {
    try {
      const response = await fetch("/api/cart");
      if (!response.ok) throw new Error("Gagal mengambil data keranjang");
      const data: CartData = await response.json();
      setCartData({
        cartItems: data.cartItems || [],
        cashGiven: data.cashGiven ?? 0,
        change: data.change ?? 0,
      });
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    fetchCartItems();
    const interval = setInterval(fetchCartItems, 2000);
    return () => clearInterval(interval);
  }, []);

  const calculateItemPrice = (menu: Menu) => {
    let price = menu.price;
    const activeDiscount = menu.discounts?.find((d) => d.discount.isActive);
    if (activeDiscount) {
      price -=
        activeDiscount.discount.type === "PERCENTAGE"
          ? (activeDiscount.discount.value / 100) * menu.price
          : activeDiscount.discount.value;
    }
    return price > 0 ? price : 0;
  };

  const calculateCartTotals = () => {
    let totalBeforeDiscount = 0;
    let totalDiscountAmount = 0;

    cartData.cartItems.forEach((item) => {
      const originalPrice = item.menu.price * item.quantity;
      const discountedPrice = calculateItemPrice(item.menu) * item.quantity;
      totalBeforeDiscount += originalPrice;
      totalDiscountAmount += originalPrice - discountedPrice;
    });

    const totalAfterDiscount = totalBeforeDiscount - totalDiscountAmount;
    const taxAmount = totalAfterDiscount * 0.10; // Pajak 10%
    const gratuityAmount = totalAfterDiscount * 0.02; // Gratuity 2%
    const finalTotal = totalAfterDiscount + taxAmount + gratuityAmount;

    return { totalBeforeDiscount, totalDiscountAmount, totalAfterDiscount, taxAmount, gratuityAmount, finalTotal };
  };

  const { totalBeforeDiscount, totalDiscountAmount, totalAfterDiscount, taxAmount, gratuityAmount, finalTotal } = calculateCartTotals();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFFAF0] to-[#FFE4C4] p-6 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-[#0E0E0E]">🛒 Pesanan Anda</h1>
        {cartData.cartItems.length === 0 ? (
          <p className="text-center text-[#979797]">
            {cartData.cashGiven > 0 ? "Pembayaran selesai. Terima kasih!" : "Belum ada item di pesanan Anda."}
          </p>
        ) : (
          <div className="space-y-4">
            {cartData.cartItems.map((item) => {
              const originalPrice = item.menu.price;
              const discountedPrice = calculateItemPrice(item.menu);
              const discountPerItem = originalPrice - discountedPrice;
              const totalOriginalPrice = originalPrice * item.quantity;
              const totalDiscountedPrice = discountedPrice * item.quantity;

              return (
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
                      {discountPerItem > 0 && (
                        <p className="text-sm text-green-600">
                          Diskon per item: Rp {discountPerItem.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {discountPerItem > 0 ? (
                      <>
                        <p className="text-sm text-gray-500 line-through">
                          Rp {totalOriginalPrice.toLocaleString()}
                        </p>
                        <p className="text-lg font-semibold text-green-600">
                          Rp {totalDiscountedPrice.toLocaleString()}
                        </p>
                      </>
                    ) : (
                      <p className="text-lg font-semibold">
                        Rp {totalOriginalPrice.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="mt-6 border-t pt-4">
              <div className="text-right space-y-2">
                <p className="text-lg">Subtotal: Rp {totalBeforeDiscount.toLocaleString()}</p>
                {totalDiscountAmount > 0 && (
                  <p className="text-lg text-green-600">
                    Diskon: Rp {totalDiscountAmount.toLocaleString()}
                  </p>
                )}
                <p className="text-lg">Total Setelah Diskon: Rp {totalAfterDiscount.toLocaleString()}</p>
                <p className="text-lg">Pajak (10%): Rp {taxAmount.toLocaleString()}</p>
                <p className="text-lg">Gratuity (2%): Rp {gratuityAmount.toLocaleString()}</p>
                <h2 className="text-xl font-bold">
                  Total Bayar: Rp {finalTotal.toLocaleString()}
                </h2>
                {cartData.cashGiven > 0 && (
                  <>
                    <p className="text-lg">Uang Diberikan: Rp {cartData.cashGiven.toLocaleString()}</p>
                    <p className="text-lg text-green-600">
                      Kembalian: Rp {cartData.change.toLocaleString()}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}