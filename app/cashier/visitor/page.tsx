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
  const [currentTime, setCurrentTime] = useState(new Date());

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
    const cartInterval = setInterval(fetchCartItems, 2000);

    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(cartInterval);
      clearInterval(timeInterval);
    };
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

    const totalAfterDiscount = subtotalWithModifiers - totalDiscountFromTotal;
    const taxAmount = totalAfterDiscount * 0.10;
    const gratuityAmount = totalAfterDiscount * 0.02;
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

  const latestItem = cartData.cartItems.length > 0 ? cartData.cartItems[cartData.cartItems.length - 1] : null;
  const { basePrice: latestBasePrice, modifierCost: latestModifierCost } = latestItem
    ? calculateItemPrice(latestItem.menu, latestItem.modifierIds)
    : { basePrice: 0, modifierCost: 0 };
  const latestTotalPrice = (latestBasePrice + latestModifierCost) * (latestItem?.quantity || 0);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 flex flex-col items-center">
      <div className="bg-white p-4 md:p-8 rounded-lg shadow-lg w-full max-w-5xl">
        <div className="text-left mb-6 text-base md:text-lg font-semibold text-gray-800">
          {currentTime.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}{" "}
          -{" "}
          {currentTime.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>

        <div className="flex flex-col md:flex-row gap-4 md:gap-8">
          {/* Bagian Kiri - Pesanan Terbaru dan Logo */}
          <div className="w-full md:w-1/3 flex flex-col gap-4">
            {/* Pesanan Terbaru */}
            <div className="bg-white p-4 rounded-lg shadow-inner border border-gray-200">
              <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">Pesanan Terbaru</h2>
              {latestItem ? (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <img
                      src={latestItem.menu.image}
                      alt={latestItem.menu.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div>
                      <p className="font-semibold text-gray-800">{latestItem.menu.name}</p>
                      <p className="text-sm text-gray-600">Jumlah: {latestItem.quantity}x</p>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-800">
                    Rp {latestTotalPrice.toLocaleString()}
                  </p>
                </div>
              ) : (
                <p className="text-gray-600 text-center">Tidak ada pesanan terbaru</p>
              )}
            </div>

            {/* Logo dengan Box di Luar */}
            <div className="p-2 border border-gray-200 rounded-lg flex justify-center mt-24">
              <img
                src="/logo-notarich.png" // Ganti dengan path logo Anda
                alt="Logo"
                className="w-20 h-20 md:w-24 md:h-24 object-contain"
              />
            </div>
          </div>

          {/* Bagian Kanan - Detail Seluruh Pesanan */}
          <div className="w-full md:w-2/3 bg-white p-4 md:p-6 rounded-lg shadow-inner border border-gray-200">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4 md:mb-6">Detail Pesanan</h2>
            {cartData.cartItems.length === 0 ? (
              <p className="text-gray-600 text-center">
                {cartData.cashGiven > 0
                  ? "Pembayaran selesai. Terima kasih!"
                  : "Belum ada item di pesanan Anda."}
              </p>
            ) : (
              <div className="space-y-4">
                {/* Daftar Pesanan dengan Scroll */}
                <div className="max-h-[20rem] overflow-y-auto space-y-4">
                  {cartData.cartItems
                    .slice()
                    .reverse()
                    .map((item) => {
                      const { basePrice, modifierCost } = calculateItemPrice(item.menu, item.modifierIds);
                      const discountPerItem = item.menu.price - basePrice;
                      const totalDiscountedBasePrice = basePrice * item.quantity;
                      const totalModifierCostItem = modifierCost * item.quantity;
                      const totalPrice = totalDiscountedBasePrice + totalModifierCostItem;

                      const modifierNames = Object.entries(item.modifierIds)
                        .map(([_, modifierId]) =>
                          modifierId
                            ? item.menu.modifiers.find((m) => m.modifier.id === modifierId)?.modifier.name
                            : null
                        )
                        .filter(Boolean)
                        .join(", ");

                      return (
                        <div
                          key={item.uniqueKey}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={item.menu.image}
                              alt={item.menu.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                            <div>
                              <p className="font-medium text-gray-800">
                                {item.menu.name}
                                {modifierNames ? ` (${modifierNames})` : ""}
                              </p>
                              <p className="text-sm text-gray-600">Jumlah: {item.quantity}x</p>
                              {item.note && (
                                <p className="text-sm text-gray-500">Catatan: {item.note}</p>
                              )}
                              {discountPerItem > 0 && (
                                <p className="text-sm text-green-600">
                                  Diskon: Rp {discountPerItem.toLocaleString()}
                                </p>
                              )}
                              {modifierCost > 0 && (
                                <p className="text-sm text-gray-600">
                                  Modifier: Rp {modifierCost.toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <p className="font-semibold text-gray-800">
                            Rp {totalPrice.toLocaleString()}
                          </p>
                        </div>
                      );
                    })}
                </div>
                {/* Total dan Informasi Pembayaran */}
                <div className="mt-4 md:mt-6 border-t pt-4 md:pt-6 text-right space-y-2">
                  <p className="text-sm md:text-base text-gray-800">
                    Subtotal: Rp {subtotal.toLocaleString()}
                  </p>
                  {totalModifierCost > 0 && (
                    <p className="text-sm md:text-base text-gray-800">
                      Modifier: Rp {totalModifierCost.toLocaleString()}
                    </p>
                  )}
                  {totalDiscountAmount > 0 && (
                    <p className="text-sm md:text-base text-green-600">
                      Diskon: Rp {totalDiscountAmount.toLocaleString()}
                      {totalDiscountFromTotal > 0 && (
                        <span>
                          {" "}
                          (Termasuk Diskon Total: Rp {totalDiscountFromTotal.toLocaleString()})
                        </span>
                      )}
                    </p>
                  )}
                  <p className="text-sm md:text-base text-gray-800">
                    Total Setelah Diskon: Rp {totalAfterDiscount.toLocaleString()}
                  </p>
                  <p className="text-sm md:text-base text-gray-800">
                    Pajak (10%): Rp {taxAmount.toLocaleString()}
                  </p>
                  <p className="text-sm md:text-base text-gray-800">
                    Gratuity (2%): Rp {gratuityAmount.toLocaleString()}
                  </p>
                  <h2 className="text-base md:text-lg font-bold text-gray-800">
                    Total Bayar: Rp {finalTotal.toLocaleString()}
                  </h2>
                  {cartData.cashGiven > 0 && (
                    <>
                      <p className="text-sm md:text-base text-gray-800">
                        Uang Diberikan: Rp {cartData.cashGiven.toLocaleString()}
                      </p>
                      <p className="text-sm md:text-base text-green-600">
                        Kembalian: Rp {cartData.change.toLocaleString()}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}