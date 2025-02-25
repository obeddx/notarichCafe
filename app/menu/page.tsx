"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { ShoppingCart, X } from "lucide-react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { useSearchParams } from "next/navigation";
import { jsPDF } from "jspdf";

interface Ingredient {
  id: number;
  name: string;
  start: number;
  stockIn: number;
  used: number;
  wasted: number;
  stock: number;
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
}

interface CartItem {
  menu: Menu;
  quantity: number;
  note: string;
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

export default function MenuPage() {
  const [selectedCategory, setSelectedCategory] = useState("All Menu");
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState<string>("Unknown");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [noteVisibility, setNoteVisibility] = useState<{ [key: number]: boolean }>({});
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

  const searchParams = useSearchParams();

  useEffect(() => {
    const tableFromUrl = searchParams?.get("table");
    const tableFromSession = sessionStorage.getItem("tableNumber");
    const finalTableNumber = tableFromUrl || tableFromSession || "Unknown";
    setTableNumber(finalTableNumber);
    if (tableFromUrl) {
      sessionStorage.setItem("tableNumber", tableFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (tableNumber !== "Unknown") {
      const sendTableNumber = async () => {
        try {
          const response = await fetch("/api/nomeja", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tableNumber }),
          });
          if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
          const result = await response.json();
          console.log("Table number sent successfully:", result);
        } catch (error) {
          console.error("Error sending table number:", error);
        }
      };
      sendTableNumber();
    }
  }, [tableNumber]);

  useEffect(() => {
    const storedCart = sessionStorage.getItem(`cart_table_${tableNumber}`);
    if (storedCart) setCart(JSON.parse(storedCart));
  }, [tableNumber]);

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

  const addToCart = (menu: Menu) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex((item) => item.menu.id === menu.id);
      let updatedCart;
      if (existingItemIndex !== -1) {
        updatedCart = prevCart.map((item, index) =>
          index === existingItemIndex ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        updatedCart = [...prevCart, { menu, quantity: 1, note: "" }];
      }
      setNoteVisibility((prev) => ({ ...prev, [menu.id]: false }));
      sessionStorage.setItem(`cart_table_${tableNumber}`, JSON.stringify(updatedCart));
      return updatedCart;
    });
    toast.success(`${menu.name} added to cart!`);
  };

  const removeFromCart = (menuId: number) => {
    setCart((prevCart) => {
      const updatedCart = prevCart
        .map((item) => {
          if (item.menu.id === menuId) {
            if (item.quantity > 1) return { ...item, quantity: item.quantity - 1 };
            return null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
      setNoteVisibility((prev) => {
        const newVisibility = { ...prev };
        delete newVisibility[menuId];
        return newVisibility;
      });
      sessionStorage.setItem(`cart_table_${tableNumber}`, JSON.stringify(updatedCart));
      return updatedCart;
    });
    toast.error("Item removed from cart!");
  };

  const updateCartItemNote = (menuId: number, note: string) => {
    setCart((prevCart) => {
      const updatedCart = prevCart.map((item) =>
        item.menu.id === menuId ? { ...item, note } : item
      );
      sessionStorage.setItem(`cart_table_${tableNumber}`, JSON.stringify(updatedCart));
      return updatedCart;
    });
  };

  const toggleNoteVisibility = (menuId: number) => {
    setNoteVisibility((prev) => ({ ...prev, [menuId]: !prev[menuId] }));
  };

  const calculateItemPrice = (menu: Menu) => {
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
    return price > 0 ? price : 0;
  };

  const calculateCartTotals = () => {
    let totalBeforeDiscount = 0;
    let totalMenuDiscountAmount = 0;

    // Hitung subtotal dan diskon scope MENU
    cart.forEach((item) => {
      const originalPrice = item.menu.price * item.quantity;
      const discountedPrice = calculateItemPrice(item.menu) * item.quantity;
      totalBeforeDiscount += originalPrice;
      totalMenuDiscountAmount += originalPrice - discountedPrice;
    });

    const totalAfterMenuDiscount = totalBeforeDiscount - totalMenuDiscountAmount;
    const taxAmount = taxRate * totalAfterMenuDiscount;
    const gratuityAmount = gratuityRate * totalAfterMenuDiscount;
    const initialFinalTotal = totalAfterMenuDiscount + taxAmount + gratuityAmount;

    // Terapkan diskon scope TOTAL pada initialFinalTotal
    let totalDiscountAmount = totalMenuDiscountAmount;
    if (selectedDiscountId) {
      const selectedDiscount = discounts.find((d) => d.id === selectedDiscountId);
      if (selectedDiscount) {
        const additionalDiscount =
          selectedDiscount.type === "PERCENTAGE"
            ? (selectedDiscount.value / 100) * initialFinalTotal
            : selectedDiscount.value;
        totalDiscountAmount += additionalDiscount;
      }
    }

    totalDiscountAmount = Math.min(totalDiscountAmount, initialFinalTotal);
    const totalAfterDiscount = initialFinalTotal - totalDiscountAmount;

    return {
      totalBeforeDiscount,
      totalMenuDiscountAmount,
      taxAmount,
      gratuityAmount,
      totalDiscountAmount,
      totalAfterDiscount,
    };
  };

  const createOrder = async () => {
    const { totalBeforeDiscount, taxAmount, gratuityAmount, totalDiscountAmount, totalAfterDiscount } = calculateCartTotals();
    const orderDetails = {
      customerName,
      tableNumber,
      items: cart.map((item) => ({
        menuId: item.menu.id,
        quantity: item.quantity,
        note: item.note,
      })),
      total: totalBeforeDiscount,
      discountId: selectedDiscountId || undefined,
      taxAmount,
      gratuityAmount,
      discountAmount: totalDiscountAmount,
      finalTotal: totalAfterDiscount,
    };
    try {
      const response = await fetch("/api/placeOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderDetails),
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
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
    const { totalBeforeDiscount, totalDiscountAmount, taxAmount, gratuityAmount, totalAfterDiscount } = calculateCartTotals();
    cart.forEach((item) => {
      const itemTotal = calculateItemPrice(item.menu) * item.quantity;
      doc.text(item.menu.name, margin, yPosition, { maxWidth: 30 });
      doc.text(`${item.quantity} x ${calculateItemPrice(item.menu).toLocaleString()}`, margin, yPosition + 4, { maxWidth: 30 });
      doc.text(`Rp${itemTotal.toLocaleString()}`, rightMargin, yPosition, { align: "right" });
      totalQty += item.quantity;
      yPosition += 10;
    });

    yPosition += 2;
    doc.text(`Total qty = ${totalQty}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Subtotal: Rp${totalBeforeDiscount.toLocaleString()}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Diskon: Rp${totalDiscountAmount.toLocaleString()}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Pajak: Rp${taxAmount.toLocaleString()}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Gratuity: Rp${gratuityAmount.toLocaleString()}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Total: Rp${totalAfterDiscount.toLocaleString()}`, margin, yPosition);
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

  const renderPaymentMethodModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-orange-600 mb-4">Pilih Metode Pembayaran</h2>
        <button
          onClick={async () => {
            setPaymentOption("cash");
            setShowPaymentMethodModal(false);
            const order = await createOrder();
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
        <button
          onClick={async () => {
            setPaymentOption("ewallet");
            setShowPaymentMethodModal(false);
            const { totalBeforeDiscount } = calculateCartTotals();
            const payload = {
              orderId: "ORDER-" + new Date().getTime(),
              total: totalBeforeDiscount,
              customerName,
              customerEmail: "",
              customerPhone: "",
              item_details: cart.map((item) => ({
                id: item.menu.id.toString(),
                price: item.menu.price,
                quantity: item.quantity,
                name: item.menu.name,
              })),
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
                if (window.snap) {
                  window.snap.pay(data.snapToken, {
                    onSuccess: async (result: unknown) => {
                      console.log("Pembayaran sukses:", result);
                      const order = await createOrder();
                      if (order) {
                        setOrderRecord(order);
                        toast.success("Order placed successfully!");
                        generateReceiptPDF();
                        setCart([]);
                        sessionStorage.removeItem(`cart_table_${tableNumber}`);
                      } else {
                        setOrderError("Failed to create order after payment.");
                        toast.error("Failed to create order after payment.");
                      }
                    },
                    onPending: (result: unknown) => console.log("Pembayaran pending:", result),
                    onError: (result: unknown) => console.log("Pembayaran error:", result),
                    onClose: () => console.log("Popup pembayaran ditutup tanpa menyelesaikan pembayaran"),
                  });
                }
              } else {
                console.error("Gagal mendapatkan snap token", data);
              }
            } catch (error: unknown) {
              console.error("Error generating snap token:", error);
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

  const renderReceiptModal = () => {
    const { totalBeforeDiscount, totalDiscountAmount, taxAmount, gratuityAmount, totalAfterDiscount } = calculateCartTotals();
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg w-full max-w-md" id="receipt-content">
          <h2 className="text-2xl font-bold text-orange-600 mb-4">Order Receipt</h2>
          <h3 className="text-xl text-black mb-4">Table Number: {tableNumber}</h3>
          <ul className="space-y-2">
            {cart.map((item) => (
              <li key={item.menu.id} className="flex justify-between text-black">
                <span>
                  {item.quantity}x {item.menu.name}
                </span>
                <span>Rp{(calculateItemPrice(item.menu) * item.quantity).toLocaleString()}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t pt-4">
            <p className="text-lg text-black">Subtotal: Rp{totalBeforeDiscount.toLocaleString()}</p>
            <p className="text-lg text-black">Diskon: Rp{totalDiscountAmount.toLocaleString()}</p>
            <p className="text-lg text-black">Pajak: Rp{taxAmount.toLocaleString()}</p>
            <p className="text-lg text-black">Gratuity: Rp{gratuityAmount.toLocaleString()}</p>
            <p className="text-lg font-semibold text-black">
              Total: Rp{totalAfterDiscount.toLocaleString()}
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
          {categories.map((category) => (
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
              const discountedPrice = calculateItemPrice(item);
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
        className="fixed bottom-4 left-4 bg-orange-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-orange-700 transition flex items-center justify-center gap-3"
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
            Rp{calculateCartTotals().totalAfterDiscount.toLocaleString()}
          </span>
          <span className="text-xs">Checkout</span>
        </div>
      </button>

      {isCartOpen && (
        <div className="fixed top-0 right-0 w-full md:w-1/3 h-full bg-white shadow-lg p-6 overflow-y-auto z-50 flex flex-col">
          <div className="flex justify-between items-center border-b pb-4 mb-4">
            <h2 className="text-2xl font-bold text-orange-600">Your Cart</h2>
            <button onClick={() => setIsCartOpen(false)}>
              <X className="w-6 h-6 text-gray-800 hover:text-orange-600" />
            </button>
          </div>
          {cart.length === 0 ? (
            <p className="text-center text-gray-500 flex-grow">Your cart is empty.</p>
          ) : (
            <>
              <div className="flex-grow overflow-y-auto">
                <ul className="space-y-4">
                  {cart.map((item) => {
                    const itemTotalPrice = calculateItemPrice(item.menu) * item.quantity;
                    const isNoteOpen = noteVisibility[item.menu.id] || false;
                    return (
                      <li key={item.menu.id} className="flex flex-col border-b pb-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold text-gray-900">{item.menu.name}</h3>
                          <p className="text-orange-600 font-semibold">
                            Rp{calculateItemPrice(item.menu).toLocaleString()} x {item.quantity}
                          </p>
                        </div>
                        <p className="text-right text-gray-700 font-semibold">
                          Total: Rp{itemTotalPrice.toLocaleString()}
                        </p>
                        <div className="flex justify-between items-center mt-2">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => removeFromCart(item.menu.id)}
                              className="px-4 py-2 bg-red-500 text-white text-lg font-bold rounded-full shadow-md hover:bg-red-700 transition"
                            >
                              −
                            </button>
                            <span className="text-xl font-bold min-w-[40px] text-center text-black">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => addToCart(item.menu)}
                              className="px-4 py-2 bg-green-500 text-white text-lg font-bold rounded-full shadow-md hover:bg-green-700 transition"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        {isNoteOpen ? (
                          <textarea
                            className="mt-2 p-2 border rounded-lg w-full"
                            placeholder="Add note (e.g., no sugar, extra spicy)"
                            value={item.note}
                            onChange={(e) => updateCartItemNote(item.menu.id, e.target.value)}
                          />
                        ) : (
                          <button
                            onClick={() => toggleNoteVisibility(item.menu.id)}
                            className="mt-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm hover:bg-gray-300 transition"
                          >
                            Add Note
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Customer Name (Required)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
             
              <div className="p-4 bg-gray-100 rounded-lg mt-auto">
                <h3 className="text-xl font-bold text-gray-900">Rincian Harga:</h3>
                <p className="text-lg text-gray-900">
                  Subtotal: Rp{calculateCartTotals().totalBeforeDiscount.toLocaleString()}
                </p>
                <p className="text-lg text-gray-900">
                  Diskon: Rp{calculateCartTotals().totalDiscountAmount.toLocaleString()}
                </p>
                <p className="text-lg text-gray-900">
                  Pajak: Rp{calculateCartTotals().taxAmount.toLocaleString()}
                </p>
                <p className="text-lg text-gray-900">
                  Gratuity: Rp{calculateCartTotals().gratuityAmount.toLocaleString()}
                </p>
                <p className="text-2xl text-orange-600 font-semibold">
                  Total: Rp{calculateCartTotals().totalAfterDiscount.toLocaleString()}
                </p>
                <button
                  onClick={handleShowPaymentModal}
                  className="mt-4 w-full px-6 py-3 bg-orange-600 text-white rounded-full text-lg font-semibold hover:bg-orange-700 transition"
                >
                  Pesan Sekarang
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {showPaymentMethodModal && renderPaymentMethodModal()}
      {showReceiptModal && renderReceiptModal()}
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