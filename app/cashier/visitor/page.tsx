"use client";

import { useEffect, useState } from "react";

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
  discounts: { discount: Discount }[];
  modifiers: { modifier: Modifier }[];
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
  modifierIds: { [categoryId: number]: number | null };
  uniqueKey: string;
}

interface CartData {
  cartItems: CartItem[];
  cashGiven: number;
  change: number;
  selectedDiscountId: number | null;
}

export default function CustomerOrderDisplay() {
  const [cartData, setCartData] = useState<CartData>({
    cartItems: [],
    cashGiven: 0,
    change: 0,
    selectedDiscountId: null,
  });
  const [discounts, setDiscounts] = useState<Discount[]>([]);

  const fetchCartItems = async () => {
    try {
      const response = await fetch("/api/cart");
      if (!response.ok) throw new Error("Gagal mengambil data keranjang");
      const data: CartData = await response.json();
      setCartData({
        cartItems: data.cartItems || [],
        cashGiven: data.cashGiven ?? 0,
        change: data.change ?? 0,
        selectedDiscountId: data.selectedDiscountId ?? null,
      });
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchDiscounts = async () => {
    try {
      const response = await fetch("/api/diskon");
      if (!response.ok) throw new Error("Gagal mengambil data diskon");
      const data = await response.json();
      setDiscounts(data.filter((d: Discount) => d.scope === "TOTAL" && d.isActive));
    } catch (error) {
      console.error("Error fetching discounts:", error);
    }
  };

  useEffect(() => {
    fetchCartItems();
    fetchDiscounts();
    const interval = setInterval(fetchCartItems, 2000);
    return () => clearInterval(interval);
  }, []);

  const calculateItemPrice = (menu: Menu, modifierIds: { [categoryId: number]: number | null }) => {
    let basePrice = menu.price;
    const activeDiscount = menu.discounts?.find((d) => d.discount.isActive && d.discount.scope === "MENU");
    if (activeDiscount) {
      basePrice -=
        activeDiscount.discount.type === "PERCENTAGE"
          ? (activeDiscount.discount.value / 100) * menu.price
          : activeDiscount.discount.value;
    }
    basePrice = basePrice > 0 ? basePrice : 0;

    let modifierCost = 0;
    Object.entries(modifierIds).forEach(([_, modifierId]) => {
      if (modifierId) {
        const modifier = menu.modifiers.find((m) => m.modifier.id === modifierId)?.modifier;
        if (modifier) modifierCost += modifier.price;
      }
    });

    return { basePrice, modifierCost };
  };

  const calculateCartTotals = () => {
    let subtotal = 0;
    let totalMenuDiscountAmount = 0;
    let totalModifierCost = 0;

    // Hitung subtotal, diskon menu, dan modifier
    cartData.cartItems.forEach((item) => {
      const { basePrice, modifierCost } = calculateItemPrice(item.menu, item.modifierIds);
      const originalPrice = item.menu.price;
      subtotal += originalPrice * item.quantity;
      totalMenuDiscountAmount += (originalPrice - basePrice) * item.quantity;
      totalModifierCost += modifierCost * item.quantity;
    });

    const subtotalAfterMenuDiscount = subtotal - totalMenuDiscountAmount;
    const subtotalWithModifiers = subtotalAfterMenuDiscount + totalModifierCost;

    let totalDiscountAmount = totalMenuDiscountAmount;
    let totalDiscountFromTotal = 0;

    // Terapkan diskon total jika ada
    if (cartData.selectedDiscountId) {
      const selectedDiscount = discounts.find((d) => d.id === cartData.selectedDiscountId);
      if (selectedDiscount) {
        totalDiscountFromTotal =
          selectedDiscount.type === "PERCENTAGE"
            ? (selectedDiscount.value / 100) * subtotalWithModifiers
            : selectedDiscount.value;
        totalDiscountAmount += totalDiscountFromTotal;
      }
    }

    // Total setelah semua diskon
    const totalAfterDiscount = subtotalWithModifiers - totalDiscountFromTotal;
    const taxAmount = totalAfterDiscount * 0.10; // Pajak 10%
    const gratuityAmount = totalAfterDiscount * 0.02; // Gratuity 2%
    const finalTotal = totalAfterDiscount + taxAmount + gratuityAmount;

    return {
      subtotal,
      totalMenuDiscountAmount,
      totalModifierCost,
      totalDiscountAmount,
      totalAfterDiscount,
      taxAmount,
      gratuityAmount,
      finalTotal,
      totalDiscountFromTotal,
    };
  };

  const {
    subtotal,
    totalMenuDiscountAmount,
    totalModifierCost,
    totalDiscountAmount,
    totalAfterDiscount,
    taxAmount,
    gratuityAmount,
    finalTotal,
    totalDiscountFromTotal,
  } = calculateCartTotals();

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
              const { basePrice, modifierCost } = calculateItemPrice(item.menu, item.modifierIds);
              const discountPerItem = item.menu.price - basePrice;
              const totalOriginalBasePrice = item.menu.price * item.quantity;
              const totalDiscountedBasePrice = basePrice * item.quantity;
              const totalModifierCostItem = modifierCost * item.quantity;
              const totalPrice = totalDiscountedBasePrice + totalModifierCostItem;

              const modifierNames = Object.entries(item.modifierIds)
                .map(([_, modifierId]) =>
                  modifierId ? item.menu.modifiers.find((m) => m.modifier.id === modifierId)?.modifier.name : null
                )
                .filter(Boolean)
                .join(", ");

              return (
                <div
                  key={item.uniqueKey}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={item.menu.image}
                      alt={item.menu.name}
                      className="w-16 h-16 object-cover rounded-full"
                    />
                    <div>
                      <h3 className="font-semibold">
                        {item.menu.name}{modifierNames ? ` (${modifierNames})` : ""}
                      </h3>
                      <p className="text-sm text-gray-600">Jumlah: {item.quantity}</p>
                      {item.note && (
                        <p className="text-sm text-gray-500">Catatan: {item.note}</p>
                      )}
                      {discountPerItem > 0 && (
                        <p className="text-sm text-green-600">
                          Diskon per item: Rp {discountPerItem.toLocaleString()}
                        </p>
                      )}
                      {modifierCost > 0 && (
                        <p className="text-sm text-gray-600">
                          Modifier per item: Rp {modifierCost.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {discountPerItem > 0 ? (
                      <>
                        <p className="text-sm text-gray-500 line-through">
                          Rp {totalOriginalBasePrice.toLocaleString()}
                        </p>
                        <p className="text-lg font-semibold text-green-600">
                          Rp {totalPrice.toLocaleString()}
                        </p>
                      </>
                    ) : (
                      <p className="text-lg font-semibold">
                        Rp {totalPrice.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="mt-6 border-t pt-4">
              <div className="text-right space-y-2">
                <p className="text-lg">Subtotal: Rp {subtotal.toLocaleString()}</p>
                {totalModifierCost > 0 && (
                  <p className="text-lg">Modifier: Rp {totalModifierCost.toLocaleString()}</p>
                )}
                {totalDiscountAmount > 0 && (
                  <p className="text-lg text-green-600">
                    Diskon: Rp {totalDiscountAmount.toLocaleString()}
                    {totalDiscountFromTotal > 0 && (
                      <span> (Termasuk Diskon Total: Rp {totalDiscountFromTotal.toLocaleString()})</span>
                    )}
                  </p>
                )}
                <p className="text-lg">
                  Total Setelah Diskon: Rp {totalAfterDiscount.toLocaleString()}
                </p>
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