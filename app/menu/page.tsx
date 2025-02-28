"use client";
import { useState, useEffect, ChangeEvent } from "react";
import Image from "next/image";
import { ShoppingCart, X, ChevronDown } from "lucide-react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { useSearchParams } from "next/navigation";
import { jsPDF } from "jspdf";
import io from "socket.io-client";
import html2canvas from "html2canvas";

// Interface definitions remain unchanged
interface Ingredient {
  id: number;
  name: string;
  start: number;
  stockIn: number;
  used: number;
  wasted: number;
  stock: number;
}

interface MidtransResult {
  transaction_id: string;
  status_code: string;
  status_message: string;
  [key: string]: any;
}

interface MenuIngredient {
  id: number;
  menuId: number;
  ingredientId: number;
  amount: number;
  ingredient: Ingredient;
}

interface Discount {
  id: number;
  name: string;
  type: "PERCENTAGE" | "NORMAL";
  scope: "MENU" | "TOTAL";
  value: number;
  isActive: boolean;
}

interface Tax {
  id: number;
  value: number;
  isActive: boolean;
}

interface Gratuity {
  id: number;
  value: number;
  isActive: boolean;
}

interface ModifierCategory {
  id: number;
  name: string;
}

interface Modifier {
  modifier: {
    id: number;
    name: string;
    price: number;
    category: ModifierCategory;
  };
}

interface Menu {
  id: number;
  name: string;
  image: string;
  description: string;
  price: number;
  ingredients: MenuIngredient[];
  category: string;
  rating: number;
  stock: boolean;
  discounts: { discount: Discount }[];
  modifiers: Modifier[];
}

interface CartItem {
  menu: Menu;
  quantity: number;
  note: string;
  modifierIds: { [categoryId: number]: number | null };
  uniqueKey: string;
}

const categories = [
  "All Menu",
  "Coffee",
  "Tea",
  "Frappe",
  "Juice",
  "Milk Base",
  "Refresher",
  "Cocorich",
  "Mocktail",
  "Snack",
  "Main Course",
];

// Fungsi loadMidtransScript didefinisikan di luar komponen
const loadMidtransScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.snap) {
      resolve();
    } else {
      const script = document.createElement("script");
      script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
      script.setAttribute("data-client-key", process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "YOUR_CLIENT_KEY");
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Gagal memuat Midtrans Snap"));
      document.body.appendChild(script);
    }
  });
};

export default function MenuPage() {
  const [selectedCategory, setSelectedCategory] = useState("All Menu");
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState<string>("Unknown");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [noteVisibility, setNoteVisibility] = useState<{ [key: string]: boolean }>({});
  const [orderError, setOrderError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [paymentOption, setPaymentOption] = useState<"cash" | "ewallet" | null>(null);
  const [orderRecord, setOrderRecord] = useState<string>("");
  const [snapToken, setSnapToken] = useState<string>("");
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState<number | null>(null);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [gratuityRate, setGratuityRate] = useState<number>(0);
  const [categoriesState, setCategories] = useState<string[]>([]);
  const [showReservationDetails, setShowReservationDetails] = useState(false);

  const searchParams = useSearchParams();

  // Deteksi reservasi dan konfigurasi awal
  useEffect(() => {
    const tableFromUrl = searchParams?.get("table");
    const reservation = searchParams?.get("reservation") === "true";
    const bookingCode = searchParams?.get("bookingCode");
    const finalTableNumber = tableFromUrl || sessionStorage.getItem("tableNumber") || "Unknown";
    if (reservation && bookingCode) {
      setTableNumber(finalTableNumber); // Hanya nomor meja
      sessionStorage.setItem("reservation", "true");
      sessionStorage.setItem("bookingCode", bookingCode);
      setPaymentOption("ewallet");
      setCustomerName(JSON.parse(sessionStorage.getItem("reservationData") || "{}").namaCustomer || "");
    } else {
      setTableNumber(finalTableNumber);
    }
  
    const storedCart = sessionStorage.getItem(`cart_table_${finalTableNumber}`); // Gunakan finalTableNumber
    if (storedCart) {
      const parsedCart = JSON.parse(storedCart);
      const updatedCart = parsedCart.map((item: CartItem) => ({
        ...item,
        uniqueKey: item.uniqueKey || `${item.menu.id}-${JSON.stringify(item.modifierIds)}`,
      }));
      setCart(updatedCart);
    }
  }, [searchParams]);

  // Kirim nomor meja ke server
  useEffect(() => {
    if (tableNumber !== "Unknown") {
      const sendTableNumber = async () => {
        try {
          const cleanTableNumber = tableNumber.split(" - ")[0].replace("Meja ", "");
          const response = await fetch("/api/nomeja", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tableNumber: cleanTableNumber }),
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorData.message || "Unknown error"}`);
          }
          const result = await response.json();
          console.log("Table number sent successfully:", result);
        } catch (error) {
          console.error("Error sending table number:", error);
          toast.error("Gagal mengirim nomor meja ke server.");
        }
      };
      sendTableNumber();
    }
  }, [tableNumber]);

  // Fetch kategori
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categoryMenu");
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        const categoryNames = data.categories.map((cat: { kategori: string }) => cat.kategori);
        setCategories(["All Menu", ...categoryNames]);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
        setError("Failed to load categories.");
      }
    };
    fetchCategories();
  }, []);

  // Fetch menu dan rate
  useEffect(() => {
    const fetchMenuAndRates = async () => {
      try {
        const menuResponse = await fetch("/api/getMenu");
        if (!menuResponse.ok) throw new Error(`HTTP error! Status: ${menuResponse.status}`);
        const menuData = await menuResponse.json();
        const transformedMenu: Menu[] = menuData.map((item: Partial<Menu>) => ({
          id: item.id ?? 0,
          name: item.name ?? "Unknown",
          image: item.image ? item.image : "/default-image.jpg",
          description: item.description ?? "No description available",
          price: item.price ?? 0,
          ingredients: item.ingredients ?? [],
          category: item.category ?? "Uncategorized",
          rating: item.rating !== undefined ? item.rating : 4.5,
          stock: item.stock !== undefined ? item.stock : true,
          discounts: item.discounts ?? [],
          modifiers: item.modifiers ?? [],
        }));
        setMenus(transformedMenu);

        const discountResponse = await fetch("/api/diskon");
        if (!discountResponse.ok) throw new Error(`HTTP error! Status: ${discountResponse.status}`);
        const discountData = await discountResponse.json();
        setDiscounts(discountData.filter((d: Discount) => d.scope === "TOTAL" && d.isActive));

        const taxResponse = await fetch("/api/tax");
        if (!taxResponse.ok) throw new Error(`HTTP error! Status: ${taxResponse.status}`);
        const taxData = await taxResponse.json();
        const activeTax = taxData.find((t: Tax) => t.isActive);
        setTaxRate(activeTax ? activeTax.value / 100 : 0);

        const gratuityResponse = await fetch("/api/gratuity");
        if (!gratuityResponse.ok) throw new Error(`HTTP error! Status: ${gratuityResponse.status}`);
        const gratuityData = await gratuityResponse.json();
        const activeGratuity = gratuityData.find((g: Gratuity) => g.isActive);
        setGratuityRate(activeGratuity ? activeGratuity.value / 100 : 0);
      } catch (err) {
        if (err instanceof Error) setError(`Failed to load data: ${err.message}`);
        else setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };
    fetchMenuAndRates();
  }, []);

  const generateUniqueKey = (menuId: number, modifierIds: { [categoryId: number]: number | null }) => {
    return `${menuId}-${JSON.stringify(modifierIds)}`;
  };

  const addToCart = (menu: Menu, modifierIds: { [categoryId: number]: number | null } = {}) => {
    setCart((prevCart) => {
      const uniqueKey = generateUniqueKey(menu.id, modifierIds);
      const existingItemIndex = prevCart.findIndex((item) => item.uniqueKey === uniqueKey);

      let updatedCart;
      if (existingItemIndex !== -1) {
        updatedCart = prevCart.map((item, index) =>
          index === existingItemIndex ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        const newItem = {
          menu,
          quantity: 1,
          note: "",
          modifierIds,
          uniqueKey,
        };
        updatedCart = [...prevCart, newItem];
      }

      setNoteVisibility((prev) => ({ ...prev, [uniqueKey]: false }));
      sessionStorage.setItem(`cart_table_${tableNumber}`, JSON.stringify(updatedCart));
      return updatedCart;
    });
    toast.success(`${menu.name} added to cart!`);
  };

  const removeFromCart = (uniqueKey: string) => {
    setCart((prevCart) => {
      const updatedCart = prevCart
        .map((item) => {
          if (item.uniqueKey === uniqueKey) {
            if (item.quantity > 1) return { ...item, quantity: item.quantity - 1 };
            return null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
      setNoteVisibility((prev) => {
        const newVisibility = { ...prev };
        delete newVisibility[uniqueKey];
        return newVisibility;
      });
      sessionStorage.setItem(`cart_table_${tableNumber}`, JSON.stringify(updatedCart));
      return updatedCart;
    });
    toast.error("Item removed from cart!");
  };

  const updateCartItemModifier = (uniqueKey: string, categoryId: number, modifierId: number | null) => {
    setCart((prevCart) => {
      let updatedCart = [...prevCart];
      const itemIndex = updatedCart.findIndex((item) => item.uniqueKey === uniqueKey);

      if (itemIndex !== -1) {
        const item = updatedCart[itemIndex];
        const existingModifierIds = item.modifierIds;
        const newModifierIds = { ...existingModifierIds, [categoryId]: modifierId };
        const newUniqueKey = generateUniqueKey(item.menu.id, newModifierIds);

        const existingNewItemIndex = updatedCart.findIndex(
          (otherItem) => otherItem.uniqueKey === newUniqueKey && otherItem !== item
        );

        if (existingNewItemIndex !== -1) {
          updatedCart[existingNewItemIndex].quantity += item.quantity;
          updatedCart = updatedCart.filter((_, idx) => idx !== itemIndex);
        } else {
          updatedCart[itemIndex] = { ...item, modifierIds: newModifierIds, uniqueKey: newUniqueKey };
          setNoteVisibility((prev) => {
            const newVisibility = { ...prev };
            if (newUniqueKey !== uniqueKey) {
              newVisibility[newUniqueKey] = newVisibility[uniqueKey] || false;
              delete newVisibility[uniqueKey];
            }
            return newVisibility;
          });
        }
      }

      sessionStorage.setItem(`cart_table_${tableNumber}`, JSON.stringify(updatedCart));
      return updatedCart;
    });
  };

  const updateCartItemNote = (uniqueKey: string, note: string) => {
    setCart((prevCart) => {
      const updatedCart = prevCart.map((item) =>
        item.uniqueKey === uniqueKey ? { ...item, note } : item
      );
      sessionStorage.setItem(`cart_table_${tableNumber}`, JSON.stringify(updatedCart));
      return updatedCart;
    });
  };

  const toggleNoteVisibility = (uniqueKey: string) => {
    setNoteVisibility((prev) => ({ ...prev, [uniqueKey]: !prev[uniqueKey] }));
  };

  const calculateItemPrice = (menu: Menu, modifierIds: { [categoryId: number]: number | null }) => {
    let price = menu.price;
    const activeDiscount = Array.isArray(menu.discounts)
      ? menu.discounts.find((d) => d.discount.isActive)
      : undefined;
    if (activeDiscount) {
      price -=
        activeDiscount.discount.type === "PERCENTAGE"
          ? (activeDiscount.discount.value / 100) * menu.price
          : activeDiscount.discount.value;
    }

    let modifierTotal = 0;
    Object.entries(modifierIds).forEach(([_, modifierId]) => {
      if (modifierId) {
        const modifier = menu.modifiers.find((m) => m.modifier.id === modifierId)?.modifier;
        if (modifier) modifierTotal += modifier.price;
      }
    });

    return (price + modifierTotal) > 0 ? price + modifierTotal : 0;
  };

  const calculateCartTotals = () => {
    let subtotal = 0;
    let totalMenuDiscountAmount = 0;
    let totalModifierCost = 0;

    cart.forEach((item) => {
      const originalPrice = item.menu.price;
      const discountedPrice = calculateItemPrice(item.menu, item.modifierIds);
      subtotal += originalPrice * item.quantity;
      totalMenuDiscountAmount += (originalPrice - discountedPrice) * item.quantity;

      let modifierTotal = 0;
      Object.entries(item.modifierIds).forEach(([_, modifierId]) => {
        if (modifierId) {
          const modifier = item.menu.modifiers.find((m) => m.modifier.id === modifierId)?.modifier;
          if (modifier) modifierTotal += modifier.price * item.quantity;
        }
      });
      totalModifierCost += modifierTotal;
    });

    const subtotalAfterMenuDiscount = subtotal - totalMenuDiscountAmount;
    const subtotalWithModifiers = subtotalAfterMenuDiscount + totalModifierCost;

    let totalDiscountAmount = totalMenuDiscountAmount;
    if (selectedDiscountId) {
      const selectedDiscount = discounts.find((d) => d.id === selectedDiscountId);
      if (selectedDiscount) {
        const additionalDiscount =
          selectedDiscount.type === "PERCENTAGE"
            ? (selectedDiscount.value / 100) * subtotalWithModifiers
            : selectedDiscount.value;
        totalDiscountAmount += additionalDiscount;
      }
    }

    const subtotalAfterDiscount = subtotalWithModifiers - (totalDiscountAmount - totalMenuDiscountAmount);
    const taxAmount = taxRate * subtotalAfterDiscount;
    const gratuityAmount = gratuityRate * subtotalAfterDiscount;
    const totalAfterAll = subtotalAfterDiscount + taxAmount + gratuityAmount;

    return {
      subtotal,
      totalMenuDiscountAmount,
      totalModifierCost,
      totalDiscountAmount,
      taxAmount,
      gratuityAmount,
      totalAfterAll,
    };
  };

  const createOrder = async () => {
    const bookingCode = sessionStorage.getItem("bookingCode");
    const reservationData = JSON.parse(sessionStorage.getItem("reservationData") || "{}");
    const { subtotal, totalModifierCost, totalDiscountAmount, taxAmount, gratuityAmount, totalAfterAll } = calculateCartTotals();
    
    // Pisahkan tableNumber menjadi nomor meja saja
    const cleanTableNumber = tableNumber.split(" - ")[0].replace("Meja ", "");
  
    const orderDetails = {
      customerName,
      tableNumber: cleanTableNumber, // Hanya nomor meja
      items: cart.map((item) => {
        const activeDiscount = item.menu.discounts.find((d) => d.discount.isActive);
        return {
          menuId: item.menu.id,
          quantity: item.quantity,
          note: item.note,
          modifierIds: Object.values(item.modifierIds).filter((id): id is number => id !== null),
          discountId: activeDiscount ? activeDiscount.discount.id : undefined,
        };
      }),
      total: subtotal,
      discountId: selectedDiscountId || undefined,
      taxAmount,
      gratuityAmount,
      discountAmount: totalDiscountAmount,
      finalTotal: totalAfterAll,
      paymentMethod: paymentOption === "ewallet" ? "ewallet" : undefined,
      bookingCode: bookingCode || undefined, // Kirim bookingCode terpisah
      reservationData: bookingCode ? reservationData : undefined,
    };
    console.log("Order Details Before Sending:", orderDetails);
    try {
      const response = await fetch("/api/placeOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderDetails),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorData.message || "Unknown error"}`);
      }
      const data = await response.json();
      return data.order;
    } catch (error) {
      console.error("Error creating order:", error);
      return null;
    }
  };
  
  const createOrderWithMethod = async (method: "cash" | "ewallet") => {
    const bookingCode = sessionStorage.getItem("bookingCode");
    const reservationData = JSON.parse(sessionStorage.getItem("reservationData") || "{}");
    const { subtotal, totalModifierCost, totalDiscountAmount, taxAmount, gratuityAmount, totalAfterAll } = calculateCartTotals();
    
    // Pisahkan tableNumber menjadi nomor meja saja
    const cleanTableNumber = tableNumber.split(" - ")[0].replace("Meja ", "");
  
    const orderDetails = {
      customerName,
      tableNumber: cleanTableNumber, // Hanya nomor meja
      items: cart.map((item) => {
        const activeDiscount = item.menu.discounts.find((d) => d.discount.isActive);
        return {
          menuId: item.menu.id,
          quantity: item.quantity,
          note: item.note,
          modifierIds: Object.values(item.modifierIds).filter((id): id is number => id !== null),
          discountId: activeDiscount ? activeDiscount.discount.id : undefined,
        };
      }),
      total: subtotal,
      discountId: selectedDiscountId || undefined,
      taxAmount,
      gratuityAmount,
      discountAmount: totalDiscountAmount,
      finalTotal: totalAfterAll,
      paymentMethod: method === "ewallet" ? "ewallet" : undefined,
      bookingCode: bookingCode || undefined, // Kirim bookingCode terpisah
      reservationData: bookingCode ? reservationData : undefined,
    };
    console.log("Order Details Before Sending:", orderDetails);
    try {
      const response = await fetch("/api/placeOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderDetails),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorData.message || "Unknown error"}`);
      }
      const data = await response.json();
      return data.order;
    } catch (error) {
      console.error("Error creating order:", error);
      return null;
    }
  };

  const handleShowPaymentModal = () => {
    if (!customerName.trim()) {
      toast.error("Please enter customer name!");
      return;
    }
    setShowPaymentMethodModal(true);
  };

  const handleCloseOrderSummary = () => {
    setShowReceiptModal(false);
    setCart([]);
    setSelectedDiscountId(null);
    sessionStorage.removeItem(`cart_table_${tableNumber}`);
  };

  const scrollToSummary = () => {
    const summaryElement = document.getElementById("cart-summary");
    if (summaryElement) {
      summaryElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  const generateReceiptPDF = () => {
    const doc = new jsPDF({ unit: "mm", format: [58, 200] });
    const margin = 5;
    const pageWidth = 58;
    const rightMargin = pageWidth - margin;
    let yPosition = margin;

    doc.setFontSize(16);
    doc.text("NotarichCafe", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 6;

    const now = new Date();
    doc.setFontSize(10);
    doc.text(`Tanggal: ${now.toLocaleDateString()}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Hari: ${now.toLocaleDateString("en-US", { weekday: "long" })}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Jam: ${now.toLocaleTimeString()}`, margin, yPosition);
    yPosition += 5;
    doc.text(`Operator: Kasir 1`, margin, yPosition);
    yPosition += 5;
    doc.text(`Meja: ${tableNumber}`, margin, yPosition);
    yPosition += 7;

    yPosition += 2;
    doc.line(margin, yPosition, rightMargin, yPosition);
    yPosition += 4;

    doc.setFontSize(12);
    doc.text("Pesanan", margin, yPosition);
    yPosition += 5;
    doc.setFontSize(10);
    doc.text("Item", margin, yPosition);
    doc.text("Total", rightMargin, yPosition, { align: "right" });
    yPosition += 5;
    doc.line(margin, yPosition, rightMargin, yPosition);
    yPosition += 4;

    let totalQty = 0;
    const { subtotal, totalModifierCost, totalDiscountAmount, taxAmount, gratuityAmount, totalAfterAll } = calculateCartTotals();
    cart.forEach((item) => {
      const itemBasePrice = calculateItemPrice(item.menu, item.modifierIds);
      let modifierTotal = 0;
      Object.entries(item.modifierIds).forEach(([_, modifierId]) => {
        if (modifierId) {
          const modifier = item.menu.modifiers.find((m) => m.modifier.id === modifierId)?.modifier;
          if (modifier) modifierTotal += modifier.price;
        }
      });
      const itemTotal = (itemBasePrice + modifierTotal) * item.quantity;
      const modifierNames: string[] = Object.entries(item.modifierIds)
        .map(([_, modifierId]) =>
          modifierId ? item.menu.modifiers.find((m) => m.modifier.id === modifierId)?.modifier.name ?? "" : ""
        )
        .filter(Boolean);
      const itemNameWithModifiers = modifierNames.length ? `${item.menu.name} (${modifierNames.join(", ")})` : item.menu.name;
      doc.text(itemNameWithModifiers, margin, yPosition, { maxWidth: 30 });
      doc.text(`${item.quantity} x ${(itemBasePrice + modifierTotal).toLocaleString()}`, margin, yPosition + 4, { maxWidth: 30 });
      doc.text(`Rp${itemTotal.toLocaleString()}`, rightMargin, yPosition, { align: "right" });
      totalQty += item.quantity;
      yPosition += modifierNames.length ? 12 : 10;
    });

    yPosition += 2;
    doc.text(`Total qty = ${totalQty}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Subtotal: Rp${subtotal.toLocaleString()}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Modifier: Rp${totalModifierCost.toLocaleString()}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Diskon: Rp${totalDiscountAmount.toLocaleString()}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Pajak: Rp${taxAmount.toLocaleString()}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Gratuity: Rp${gratuityAmount.toLocaleString()}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Total: Rp${totalAfterAll.toLocaleString()}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Pembayaran: ${paymentOption === "ewallet" ? "E-Wallet" : "Tunai"}`, margin, yPosition);
    yPosition += 10;
    doc.setFont("helvetica", "bold");
    const footerMaxWidth = pageWidth - 2 * margin;
    doc.text("Terimakasih telah berkunjung.", margin, yPosition, { maxWidth: footerMaxWidth, align: "center" });
    yPosition += 5;
    doc.text("Semoga hari anda menyenangkan!", margin, yPosition, { maxWidth: footerMaxWidth, align: "center" });

    doc.save("receipt.pdf");
  };

  const formatTanggalForKode = (date: string) => {
    const validDate = new Date(date);
    if (isNaN(validDate.getTime())) return "-";
    const day = String(validDate.getDate()).padStart(2, "0");
    const month = String(validDate.getMonth() + 1).padStart(2, "0");
    const year = String(validDate.getFullYear());
    const hours = String(validDate.getHours()).padStart(2, "0");
    const minutes = String(validDate.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const formatKodeBooking = (kode: string) => {
    const regex = /^RESV-(\d{2})(\d{2})(\d{4})-(\w{6})$/;
    const match = kode.match(regex);
    if (match) {
      const [, day, month, year, random] = match;
      return `RESV-${day}/${month}/${year}-${random}`;
    }
    return kode;
  };
  const captureAndDownloadReservationDetails = (kodeBooking: string, namaCustomer: string) => {
    const element = document.getElementById("reservationDetails");
    if (!element) {
      console.error("Elemen detail reservasi tidak ditemukan!");
      return;
    }
    html2canvas(element, {
      backgroundColor: null,
      useCORS: true,
      ignoreElements: (element) => element.classList.contains("no-capture"),
    }).then((canvas) => {
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `Reservasi_${namaCustomer || "Tanpa_Nama"}_${kodeBooking}.png`;
      link.click();
    });
  };

  const renderPaymentMethodModal = () => {
    const isReservation = sessionStorage.getItem("reservation") === "true";
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg w-full max-w-md">
          <h2 className="text-2xl font-bold text-orange-600 mb-4">Pilih Metode Pembayaran</h2>
          {!isReservation && (
            <button
              onClick={async () => {
                setPaymentOption("cash");
                console.log("Payment Option Set To:", "cash"); // Tambahkan log
                console.log("Current paymentOption after set:", paymentOption); // Log setelah set
                setShowPaymentMethodModal(false);
                const order = await createOrderWithMethod("cash"); // Buat fungsi baru
                console.log("Order Sent:", order); // Log hasil order
                if (order) {
                  setOrderRecord(order);
                  toast.success("Order placed successfully!");
                  setShowReceiptModal(true);
                } else {
                  setOrderError("Failed to create order. Please try again.");
                  toast.error("Failed to create order. Please try again.");
                }
              }}
              className="w-full px-6 py-3 bg-orange-600 text-white rounded-full text-lg font-semibold hover:bg-orange-700 transition mb-4"
            >
              Tunai
            </button>
          )}
          <button
            onClick={async () => {
              setPaymentOption("ewallet");
              setShowPaymentMethodModal(false);

              const { subtotal, totalModifierCost, totalDiscountAmount, taxAmount, gratuityAmount, totalAfterAll } = calculateCartTotals();

              const itemDetails = cart.map((item) => {
                const itemBasePrice = calculateItemPrice(item.menu, item.modifierIds);
                let modifierTotal = 0;
                const modifierNames: string[] = [];
                Object.entries(item.modifierIds).forEach(([_, modifierId]) => {
                  if (modifierId) {
                    const modifier = item.menu.modifiers.find((m) => m.modifier.id === modifierId)?.modifier;
                    if (modifier) {
                      modifierTotal += modifier.price * item.quantity;
                      modifierNames.push(modifier.name);
                    }
                  }
                });
                const itemNameWithModifiers = modifierNames.length ? `${item.menu.name} (${modifierNames.join(", ")})` : item.menu.name;
                return {
                  id: item.menu.id.toString(),
                  price: itemBasePrice + (modifierTotal / item.quantity),
                  quantity: item.quantity,
                  name: itemNameWithModifiers,
                };
              });

              if (taxAmount > 0) {
                itemDetails.push({ id: "tax", price: taxAmount, quantity: 1, name: "Pajak" });
              }
              if (gratuityAmount > 0) {
                itemDetails.push({ id: "gratuity", price: gratuityAmount, quantity: 1, name: "Gratuity" });
              }

              const payload = {
                orderId: "ORDER-" + new Date().getTime(),
                total: totalAfterAll,
                customerName,
                customerEmail: "customer@example.com",
                customerPhone: "",
                item_details: itemDetails,
              };

              try {
                const response = await fetch("/api/payment/generateSnapToken", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });
                const data = await response.json();
                if (data.success && data.snapToken) {
                  setSnapToken(data.snapToken);

                  await loadMidtransScript();

                  const handlePaymentSuccess = async (result: MidtransResult) => {
                    const order = await createOrder(); // paymentMethod akan "ewallet"
                    if (order) {
                      await fetch("/api/updatePaymentStatus", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          orderId: order.id,
                          paymentMethod: "ewallet",
                          paymentStatus: "paid",
                          paymentId: result.transaction_id,
                          status: "paid",
                        }),
                      });
                      const reservationData = JSON.parse(sessionStorage.getItem("reservationData") || "{}");
                      if (isReservation) {
                        reservationData.meja = tableNumber.split(" - ")[0];
                        setShowReservationDetails(true);
                        setTimeout(() => captureAndDownloadReservationDetails(reservationData.kodeBooking, reservationData.namaCustomer), 500);
                      }

                      toast.success("Order placed successfully!");
                      generateReceiptPDF();
                      setCart([]);
                      sessionStorage.removeItem(`cart_table_${tableNumber}`);
                    } else {
                      setOrderError("Failed to create order after payment.");
                      toast.error("Failed to create order after payment.");
                    }
                  };

                  window.snap.pay(data.snapToken, {
                    onSuccess: handlePaymentSuccess,
                    onPending: (result: MidtransResult) => console.log("Pembayaran pending:", result),
                    onError: (result: MidtransResult) => {
                      console.error("Pembayaran error:", result);
                      toast.error("Gagal melakukan pembayaran e-Wallet.");
                    },
                    onClose: () => console.log("Popup pembayaran ditutup tanpa menyelesaikan pembayaran"),
                  });
                } else {
                  console.error("Gagal mendapatkan snap token:", data);
                  toast.error("Gagal memproses pembayaran. Silakan coba lagi.");
                }
              } catch (error) {
                console.error("Error generating snap token or loading Midtrans:", error);
                toast.error("Terjadi kesalahan saat memproses pembayaran.");
              }
            }}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-full text-lg font-semibold hover:bg-blue-700 transition"
          >
            E-Wallet
          </button>
          <button
            onClick={() => setShowPaymentMethodModal(false)}
            className="w-full mt-4 px-6 py-3 bg-gray-300 text-gray-800 rounded-full text-lg font-semibold hover:bg-gray-400 transition"
          >
            Batal
          </button>
        </div>
      </div>
    );
  };

  const renderReceiptModal = () => {
    const { subtotal, totalModifierCost, totalDiscountAmount, taxAmount, gratuityAmount, totalAfterAll } = calculateCartTotals();
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg w-full max-w-md" id="receipt-content">
          <h2 className="text-2xl font-bold text-orange-600 mb-4">Order Receipt</h2>
          <h3 className="text-xl text-black mb-4">Table Number: {tableNumber}</h3>
          <ul className="space-y-2">
            {cart.map((item) => {
              const itemBasePrice = calculateItemPrice(item.menu, item.modifierIds);
              let modifierTotal = 0;
              Object.entries(item.modifierIds).forEach(([_, modifierId]) => {
                if (modifierId) {
                  const modifier = item.menu.modifiers.find((m) => m.modifier.id === modifierId)?.modifier;
                  if (modifier) modifierTotal += modifier.price;
                }
              });
              const itemTotal = (itemBasePrice + modifierTotal) * item.quantity;
              const modifierNames = Object.entries(item.modifierIds)
                .map(([_, modifierId]) =>
                  modifierId ? item.menu.modifiers.find((m) => m.modifier.id === modifierId)?.modifier.name : null
                )
                .filter(Boolean)
                .join(", ");
              const itemNameWithModifiers = modifierNames ? `${item.menu.name} (${modifierNames})` : item.menu.name;
              return (
                <li key={item.uniqueKey} className="flex justify-between text-black">
                  <span>{item.quantity}x {itemNameWithModifiers}</span>
                  <span>Rp{itemTotal.toLocaleString()}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 border-t pt-4">
            <p className="text-lg text-black">Subtotal: Rp{subtotal.toLocaleString()}</p>
            <p className="text-lg text-black">Modifier: Rp{totalModifierCost.toLocaleString()}</p>
            <p className="text-lg text-black">Diskon: Rp{totalDiscountAmount.toLocaleString()}</p>
            <p className="text-lg text-black">Pajak: Rp{taxAmount.toLocaleString()}</p>
            <p className="text-lg text-black">Gratuity: Rp{gratuityAmount.toLocaleString()}</p>
            <p className="text-lg font-semibold text-black">
              Total: Rp{totalAfterAll.toLocaleString()}
            </p>
          </div>
          <p className="mt-4 text-center text-green-600 font-semibold">
            Silahkan menuju kasir untuk melanjutkan proses pembayaran
          </p>
          <button
            onClick={handleCloseOrderSummary}
            className="mt-4 w-full px-6 py-3 bg-orange-600 text-white rounded-full text-lg font-semibold hover:bg-orange-700 transition"
          >
            Tutup & Selesai
          </button>
        </div>
      </div>
    );
  };

  const filteredMenu =
    selectedCategory === "All Menu"
      ? menus.filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : menus.filter(
          (item) =>
            item.category.toLowerCase().includes(selectedCategory.toLowerCase()) &&
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

  if (tableNumber === "Unknown") {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center">
        <h2 className="text-2xl mb-4">Table number tidak terdeteksi. Silakan scan barcode meja Anda.</h2>
        <Link href="/scan">
          <button className="bg-orange-600 text-white p-4 rounded-full shadow-lg hover:bg-orange-700 transition">
            Scan Barcode
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Toaster position="top-right" reverseOrder={false} />

      <section className="relative flex flex-col md:flex-row items-center justify-between px-6 md:px-16 py-20 bg-[url('/bg-heromenu.png')] bg-cover bg-center">
        <div className="max-w-2xl text-center md:text-left">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900">
            Begin your day with <br />
            a <span className="text-orange-600">perfect cup of coffee</span>
          </h1>
          <p className="mt-4 text-lg text-gray-700">
            Setting a positive tone with its comforting warmth and invigorating flavor
          </p>
        </div>
        <div className="w-full md:w-[600px] lg:w-[700px] h-[400px] md:h-[500px] relative flex justify-center">
          <Image src="/CaramelFrappucino.png" alt="Coffee Cup" layout="fill" objectFit="contain" />
        </div>
      </section>

      <div className="py-12 px-6 md:px-16 bg-[url('/bg-hero1.png')] bg-cover bg-center">
        <h2 className="text-4xl font-extrabold text-center text-orange-600 mb-8">Our Popular Menu</h2>
        <h2 className="text-2xl text-white mb-4">Table Number: {tableNumber}</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Cari Menu</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="Cari nama menu..."
          />
        </div>

        <div className="flex overflow-x-auto space-x-4 mb-8 px-4 py-2 scrollbar-hide">
          {categoriesState.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`whitespace-nowrap px-6 py-3 rounded-full text-lg font-semibold transition-all transform duration-300 shadow-lg ${
                selectedCategory === category
                  ? "bg-orange-600 text-white scale-105"
                  : "bg-gray-300 text-gray-800 hover:bg-orange-400 hover:text-white"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Loading menu...</p>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : filteredMenu.length === 0 ? (
          <p className="text-center text-gray-500">No menu available for this category.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredMenu.map((item) => {
              const discountedPrice = calculateItemPrice(item, {});
              return (
                <div
                  key={item.id}
                  className="relative border p-5 rounded-2xl shadow-2xl bg-white transition-all duration-300 transform hover:scale-105 hover:shadow-2xl overflow-hidden"
                >
                  <div className="hidden sm:block">
                    <div className="relative w-full h-64 cursor-pointer hover:scale-105 transition-transform">
                      <Image
                        src={item.image}
                        alt={item.name}
                        layout="fill"
                        objectFit="cover"
                        className="rounded-lg"
                      />
                    </div>
                    <div className="p-4 text-center">
                      <h2 className="text-2xl font-bold text-gray-900">{item.name}</h2>
                      <p className="text-gray-600 text-left">{item.description}</p>
                      <div className="text-left">
                        {discountedPrice < item.price ? (
                          <>
                            <p className="text-sm text-gray-500 line-through">
                              Rp{item.price.toLocaleString()}
                            </p>
                            <p className="text-lg font-semibold text-orange-600">
                              Rp{discountedPrice.toLocaleString()}
                            </p>
                          </>
                        ) : (
                          <p className="text-lg font-semibold text-orange-600">
                            Rp{item.price.toLocaleString()}
                          </p>
                        )}
                        {item.modifiers.length > 0 && (
                          <p className="text-sm text-gray-600">+ Modifier mulai dari Rp0</p>
                        )}
                      </div>
                      <button
                        onClick={() => addToCart(item)}
                        className="mt-4 px-6 py-3 bg-orange-600 text-white rounded-full text-lg font-semibold hover:bg-orange-700 transition flex items-center justify-center gap-2"
                      >
                        <ShoppingCart className="w-5 h-5" />
                        Add to Cart
                      </button>
                    </div>
                  </div>
                  <div className="sm:hidden flex items-center gap-4">
                    <div className="relative w-24 h-24 flex-shrink-0">
                      <Image
                        src={item.image}
                        alt={item.name}
                        layout="fill"
                        objectFit="cover"
                        className="rounded-lg"
                      />
                    </div>
                    <div className="flex-grow">
                      <h2 className="text-lg font-bold text-gray-900">{item.name}</h2>
                      <p className="text-sm text-gray-600">{item.description}</p>
                      {discountedPrice < item.price ? (
                        <>
                          <p className="text-xs text-gray-500 line-through">
                            Rp{item.price.toLocaleString()}
                          </p>
                          <p className="text-md font-semibold text-orange-600">
                            Rp{discountedPrice.toLocaleString()}
                          </p>
                        </>
                      ) : (
                        <p className="text-md font-semibold text-orange-600">
                          Rp{item.price.toLocaleString()}
                        </p>
                      )}
                      {item.modifiers.length > 0 && (
                        <p className="text-xs text-gray-600">+ Modifier mulai dari Rp0</p>
                      )}
                    </div>
                    <button
                      onClick={() => addToCart(item)}
                      className="p-2 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={() => setIsCartOpen(true)}
        className="fixed bottom-4 left-4 bg-orange-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-orange-700 transition flex items-center justify-center gap-3 z-50"
      >
        <ShoppingCart className="w-6 h-6" />
        {cart.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
            {cart.reduce((total, item) => total + item.quantity, 0)}
          </span>
        )}
        <span className="hidden sm:block">Cart</span>
        <div className="sm:hidden flex flex-col items-center">
          <span className="text-sm font-semibold">
            Rp{calculateCartTotals().totalAfterAll.toLocaleString()}
          </span>
          <span className="text-xs">Checkout</span>
        </div>
      </button>

      {isCartOpen && (
        <div className="fixed top-0 right-0 w-full md:w-1/3 h-full bg-white shadow-lg z-50 flex flex-col">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-orange-600">Your Cart</h2>
            <button onClick={() => setIsCartOpen(false)}>
              <X className="w-6 h-6 text-gray-800 hover:text-orange-600" />
            </button>
          </div>
          {cart.length === 0 ? (
            <p className="text-center text-gray-500 p-6 flex-grow">Your cart is empty.</p>
          ) : (
            <div className="flex flex-col h-full overflow-y-auto">
              {/* Daftar Item */}
              <div className="p-6">
                <ul className="space-y-6">
                  {cart.map((item) => {
                    const itemBasePrice = calculateItemPrice(item.menu, item.modifierIds);
                    let modifierTotal = 0;
                    Object.entries(item.modifierIds).forEach(([_, modifierId]) => {
                      if (modifierId) {
                        const modifier = item.menu.modifiers.find((m) => m.modifier.id === modifierId)?.modifier;
                        if (modifier) modifierTotal += modifier.price;
                      }
                    });
                    const itemPrice = itemBasePrice + modifierTotal;
                    const itemTotalPrice = itemPrice * item.quantity;
                    const isNoteOpen = noteVisibility[item.uniqueKey] || false;
                    const modifierNames = Object.entries(item.modifierIds)
                      .map(([_, modifierId]) =>
                        modifierId ? item.menu.modifiers.find((m) => m.modifier.id === modifierId)?.modifier.name : null
                      )
                      .filter(Boolean)
                      .join(", ");
                    const itemNameWithModifiers = modifierNames ? `${item.menu.name} (${modifierNames})` : item.menu.name;
                    const modifierGroups = item.menu.modifiers.reduce((acc, mod) => {
                      const categoryId = mod.modifier.category.id;
                      if (!acc[categoryId]) {
                        acc[categoryId] = { category: mod.modifier.category, modifiers: [] };
                      }
                      acc[categoryId].modifiers.push(mod);
                      return acc;
                    }, {} as { [key: number]: { category: ModifierCategory; modifiers: Modifier[] } });

                    return (
                      <li key={item.uniqueKey} className="flex flex-col border-b border-gray-200 pb-4">
                        <div className="flex justify-between items-start">
                          <h3 className="text-lg font-semibold text-gray-900 leading-tight">{itemNameWithModifiers}</h3>
                          <p className="text-orange-600 font-semibold text-sm">
                            Rp{itemPrice.toLocaleString()} x {item.quantity}
                          </p>
                        </div>
                        <p className="text-right text-gray-700 font-semibold text-sm mt-1">
                          Total: Rp{itemTotalPrice.toLocaleString()}
                        </p>
                        <div className="flex justify-between items-center mt-2">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => removeFromCart(item.uniqueKey)}
                              className="px-3 py-1 bg-red-500 text-white text-lg font-bold rounded-full hover:bg-red-600 transition"
                            >
                              −
                            </button>
                            <span className="text-lg font-bold min-w-[30px] text-center text-black">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => addToCart(item.menu, item.modifierIds)}
                              className="px-3 py-1 bg-green-500 text-white text-lg font-bold rounded-full hover:bg-green-600 transition"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 space-y-2">
                          {Object.entries(modifierGroups).map(([categoryId, group]) => (
                            <div key={categoryId}>
                              <label className="block text-sm font-medium text-gray-700">{group.category.name}:</label>
                              <select
                                value={item.modifierIds[parseInt(categoryId)] || 0}
                                onChange={(e) =>
                                  updateCartItemModifier(
                                    item.uniqueKey,
                                    parseInt(categoryId),
                                    e.target.value === "0" ? null : parseInt(e.target.value)
                                  )
                                }
                                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                              >
                                <option value={0}>Tanpa {group.category.name} (Rp0)</option>
                                {group.modifiers.map((mod) => (
                                  <option key={mod.modifier.id} value={mod.modifier.id}>
                                    {mod.modifier.name} (Rp{mod.modifier.price.toLocaleString()})
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                        {isNoteOpen ? (
                          <textarea
                            className="mt-2 p-2 border border-gray-300 rounded-lg w-full text-sm"
                            placeholder="Add note (e.g., no sugar, extra spicy)"
                            value={item.note}
                            onChange={(e) => updateCartItemNote(item.uniqueKey, e.target.value)}
                          />
                        ) : (
                          <button
                            onClick={() => toggleNoteVisibility(item.uniqueKey)}
                            className="mt-2 px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm hover:bg-gray-300 transition"
                          >
                            Add Note
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Input Nama Pelanggan dan Rincian Harga */}
              <div className="p-6 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name (Required)</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 mb-6"
                  required
                />

                <div id="cart-summary" className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Rincian Harga</h3>
                  <div className="space-y-2 text-gray-700">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>Rp{calculateCartTotals().subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Modifier:</span>
                      <span>Rp{calculateCartTotals().totalModifierCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Diskon:</span>
                      <span>Rp{calculateCartTotals().totalDiscountAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pajak:</span>
                      <span>Rp{calculateCartTotals().taxAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gratuity:</span>
                      <span>Rp{calculateCartTotals().gratuityAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-orange-600 mt-2 pt-2 border-t border-gray-300">
                      <span>Total:</span>
                      <span>Rp{calculateCartTotals().totalAfterAll.toLocaleString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleShowPaymentModal}
                    className="mt-6 w-full px-6 py-3 bg-orange-600 text-white rounded-full text-lg font-semibold hover:bg-orange-700 transition"
                  >
                    Pesan Sekarang
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Tombol Panah ke Bawah */}
          {cart.length > 0 && (
            <button
              onClick={scrollToSummary}
              className="fixed bottom-16 right-4 bg-orange-600 text-white p-3 rounded-full shadow-lg hover:bg-orange-700 transition z-50"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
          )}
        </div>
      )}

      {showPaymentMethodModal && renderPaymentMethodModal()}
      {showReceiptModal && renderReceiptModal()}
      {showReservationDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            id="reservationDetails"
            className="mt-6 p-4 border rounded-lg bg-white w-full sm:w-96 mx-auto transform transition-all hover:scale-105"
            style={{ width: "384px", minHeight: "500px" }}
          >
            <img
              src="/logo-notarich-transparent.png"
              alt="Logo NotarichCafe"
              className="mx-auto"
              style={{ width: "100%", height: "auto" }}
            />
            <h3 className="text-lg font-bold text-gray-800 text-center mb-4">Detail Reservasi</h3>
            <div>
              <p><strong>Nama :</strong> {JSON.parse(sessionStorage.getItem("reservationData") || "{}").namaCustomer}</p>
              <p><strong>Tanggal & Waktu :</strong> {formatTanggalForKode(JSON.parse(sessionStorage.getItem("reservationData") || "{}").selectedDateTime)}</p>
              <p><strong>Meja :</strong> {tableNumber.split(" - ")[0]}</p>
              <p><strong>Durasi :</strong> {JSON.parse(sessionStorage.getItem("reservationData") || "{}").durasiJam} Jam {JSON.parse(sessionStorage.getItem("reservationData") || "{}").durasiMenit} Menit</p>
              <p><strong>Kode Booking :</strong> {formatKodeBooking(JSON.parse(sessionStorage.getItem("reservationData") || "{}").kodeBooking)}</p>
            </div>
            <button
              onClick={() => setShowReservationDetails(false)}
              className="mt-6 bg-red-500 text-white p-3 rounded-md w-full hover:bg-red-600 transition-all transform hover:scale-105 no-capture"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
      {orderError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
            <p className="text-gray-700">{orderError}</p>
            <button
              onClick={() => setOrderError(null)}
              className="mt-4 w-full px-6 py-3 bg-orange-600 text-white rounded-full text-lg font-semibold hover:bg-orange-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}