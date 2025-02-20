"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { ShoppingCart, X } from "lucide-react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { useSearchParams } from "next/navigation";

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
  maxBeli: number;
}

interface MenuB {
  id: number;
  name: string;
  hargaBakul: number;
}

interface BundleMenu {
  id: number;
  menuId: number;
  quantity: number;
  menu?: MenuB;
}

interface Bundle {
  id: number;
  name: string;
  description?: string;
  image: string;
  bundlePrice?: number;
  isActive: boolean;
  bundleMenus: BundleMenu[];
}

// Definisikan tipe item keranjang menggunakan discriminated union
interface MenuCartItem {
  type: "menu";
  item: Menu;
  quantity: number;
  note: string;
}

interface BundleCartItem {
  type: "bundle";
  item: Bundle;
  quantity: number;
  note: string;
}

type CartItem = MenuCartItem | BundleCartItem;

const categories = [
  "All Menu",
  "Bundle",
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
  // Inisialisasi state cart dengan tipe CartItem[]
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState<string>("Unknown");
  const [isCartOpen, setIsCartOpen] = useState(false);
  // noteVisibility: untuk menu, key-nya berupa id number; untuk bundle, gunakan string dengan prefix "bundle-"
  const [noteVisibility, setNoteVisibility] = useState<{ [key: string]: boolean }>({});
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [bundles, setBundles] = useState<Bundle[]>([]);

  const searchParams = useSearchParams();

  // Ambil nilai tableNumber dari URL atau sessionStorage
  useEffect(() => {
    const tableFromUrl = searchParams?.get("table");
    const tableFromSession = sessionStorage.getItem("tableNumber");
    const finalTableNumber = tableFromUrl || tableFromSession || "Unknown";
    setTableNumber(finalTableNumber);

    if (tableFromUrl) {
      sessionStorage.setItem("tableNumber", tableFromUrl);
    }
  }, [searchParams]);

  // Kirim tableNumber ke API /api/nomeja
  useEffect(() => {
    if (tableNumber !== "Unknown") {
      const sendTableNumber = async () => {
        try {
          const response = await fetch("/api/nomeja", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ tableNumber }),
          });
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          const result = await response.json();
          console.log("Table number sent successfully:", result);
        } catch (error) {
          console.error("Error sending table number:", error);
        }
      };
      sendTableNumber();
    }
  }, [tableNumber]);

  // Load cart dari sessionStorage berdasarkan nomor meja
  useEffect(() => {
    const storedCart = sessionStorage.getItem(`cart_table_${tableNumber}`);
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }
  }, [tableNumber]);

  // Fetch menu data dari API
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch("/api/getMenu");
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();

        const transformedMenu: Menu[] = data.map((item: Partial<Menu>) => ({
          id: item.id ?? 0,
          name: item.name ?? "Unknown",
          image: item.image ? item.image : "/default-image.jpg",
          description: item.description ?? "No description available",
          price: item.price ?? 0,
          ingredients: item.ingredients ?? [],
          category: item.category ?? "Uncategorized",
          rating: item.rating !== undefined ? item.rating : 4.5,
          stock: item.stock !== undefined ? item.stock : true,
          maxBeli: item.maxBeli !== undefined ? item.maxBeli : 100,
        }));

        setMenus(transformedMenu);
      } catch (err) {
        if (err instanceof Error) {
          setError(`Failed to load menu data: ${err.message}`);
        } else {
          setError("Failed to load menu data.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, []);

  const fetchBundles = async () => {
    try {
      const response = await fetch("/api/bundles");
      if (!response.ok) {
        throw new Error("Error fetching bundles");
      }
      const data = await response.json();
      const transformedBundle: Bundle[] = data.map((item: Partial<Bundle>) => ({
        id: item.id ?? 0,
        name: item.name ?? "Unknown",
        image: item.image ? item.image : "/default-image.jpg",
        description: item.description ?? "No description available",
        // Gunakan bundlePrice sebagai properti harga
        bundlePrice: item.bundlePrice ?? 0,
        isActive: item.isActive ?? true,
        bundleMenus: item.bundleMenus ?? [],
      }));
      setBundles(transformedBundle);
    } catch (error) {
      console.error(error);
    }
  };
  useEffect(() => {
    fetchBundles();
  }, []);

  // Fungsi untuk menambahkan menu ke cart
  const addToCart = (menu: Menu) => {
    setCart((prevCart) => {
      // Cari apakah menu sudah ada di keranjang
      const existingItemIndex = prevCart.findIndex(
        (item) => item.type === "menu" && item.item.id === menu.id
      );
  
      let updatedCart: CartItem[];
  
      if (existingItemIndex !== -1) {
        const currentItem = prevCart[existingItemIndex];
  
        // Jika jumlah sudah mencapai maxBeli, tunda pemanggilan toast.error
        if (currentItem.quantity >= menu.maxBeli) {
          setTimeout(() => {
            toast.error("Jumlah maksimum pembelian untuk menu ini sudah tercapai!");
          }, 0);
          return prevCart;
        }
  
        updatedCart = prevCart.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        if (menu.maxBeli < 1) {
          setTimeout(() => {
            toast.error("Menu ini tidak tersedia untuk pembelian.");
          }, 0);
          return prevCart;
        }
        updatedCart = [
          ...prevCart,
          { type: "menu", item: menu, quantity: 1, note: "" },
        ];
      }
  
      sessionStorage.setItem(
        `cart_table_${tableNumber}`,
        JSON.stringify(updatedCart)
      );
      return updatedCart;
    });
  };
  
  

  // Fungsi untuk menambahkan bundle ke cart
  const addToCartBundle = (bundle: Bundle) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (item) => item.type === "bundle" && item.item.id === bundle.id
      );

      let updatedCart: CartItem[];
      if (existingItemIndex !== -1) {
        updatedCart = prevCart.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        updatedCart = [
          ...prevCart,
          { type: "bundle", item: bundle, quantity: 1, note: "" },
        ];
      }

      // Gunakan key dengan prefix "bundle-" untuk bundle
      setNoteVisibility((prev) => ({
        ...prev,
        [`bundle-${bundle.id}`]: false,
      }));

      sessionStorage.setItem(
        `cart_table_${tableNumber}`,
        JSON.stringify(updatedCart)
      );
      return updatedCart;
    });

    toast.success(`${bundle.name} bundle added to cart!`);
  };

  // Fungsi untuk menghapus item dari cart
  const removeFromCart = (id: number, type: "menu" | "bundle") => {
    setCart((prevCart) => {
      const updatedCart = prevCart
        .map((item) => {
          if (item.type === type && item.item.id === id) {
            if (item.quantity > 1) {
              return { ...item, quantity: item.quantity - 1 };
            }
            return null; // Jika quantity 1, hapus item
          }
          return item;
        })
        .filter(Boolean) as CartItem[];

      sessionStorage.setItem(
        `cart_table_${tableNumber}`,
        JSON.stringify(updatedCart)
      );
      return updatedCart;
    });
    toast.error("Item removed from cart!");
  };

  // Fungsi untuk mengupdate note pada item cart (menerima id dan tipe)
  const updateCartItemNote = (
    id: number,
    type: "menu" | "bundle",
    note: string
  ) => {
    setCart((prevCart) => {
      const updatedCart = prevCart.map((item) =>
        item.type === type && item.item.id === id ? { ...item, note } : item
      );
      sessionStorage.setItem(
        `cart_table_${tableNumber}`,
        JSON.stringify(updatedCart)
      );
      return updatedCart;
    });
  };

  // Fungsi untuk toggle visibilitas note. Untuk menu, key-nya adalah id (number), untuk bundle gunakan string dengan prefix "bundle-"
  const toggleNoteVisibility = (key: string | number) => {
    setNoteVisibility((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Fungsi untuk mengirim pesanan ke sistem kasir
  const placeOrder = async () => {
    if (!customerName.trim()) {
      toast.error("Please enter customer name!");
      return;
    }
    const orderDetails = {
      customerName,
      tableNumber,
      items: cart.map((item) =>
        item.type === "menu"
          ? { menuId: item.item.id, quantity: item.quantity, note: item.note }
          : {
              bundleId: item.item.id,
              quantity: item.quantity,
              note: item.note,
              bundleMenus: item.item.bundleMenus, // pastikan properti ini berisi array bundleMenus
            }
      ),
      total: cart.reduce((total, item) => {
        if (item.type === "menu") {
          return total + item.item.price * item.quantity;
        } else {
          const bundlePrice = item.item.bundlePrice || 0;
          return total + bundlePrice * item.quantity;
        }
      }, 0),
    };
    

    try {
      const response = await fetch("/api/placeOrder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderDetails),
      });
    
      if (!response.ok) {
        // Coba parse response error jika tersedia
        const errorData = await response.json().catch(() => ({}));
        // Lempar error dengan pesan yang Anda inginkan, tanpa menampilkan status code
        throw new Error(
          errorData.message1 || "Failed to place order. Please try again later."
        );
      }
    
      toast.success("Order placed successfully!");
      setShowOrderSummary(true); // Tampilkan ringkasan pesanan
      setIsCartOpen(false);
    }  catch (err) {
      if (err instanceof Error) {
        // Menampilkan pesan error yang dikembalikan dari API (misalnya, "Silahkan kurangi jumlah menu ...")
        toast.error(err.message);
        setOrderError(err.message);
      } else {
        // toast.error("Failed to place order. Please try again later.");
        // setOrderError("Failed to place order. Please try again later.");
      }
    }
  }    

  const handleCloseOrderSummary = () => {
    setShowOrderSummary(false);
    setCart([]);
    sessionStorage.removeItem(`cart_table_${tableNumber}`);
  };

  // Filter menu berdasarkan kategori yang dipilih
  const filteredMenu =
    selectedCategory === "All Menu"
      ? menus
      : menus.filter((item) =>
          item.category.toLowerCase().includes(selectedCategory.toLowerCase())
        );

  const filteredBundle = selectedCategory === "Bundle" ? bundles : [];

  // Jika tableNumber masih "Unknown", tampilkan tombol scan barcode
  if (tableNumber === "Unknown") {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center">
        <h2 className="text-2xl mb-4">
          Table number tidak terdeteksi. Silakan scan barcode meja Anda.
        </h2>
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

      {/* Hero Section */}
      <section
        className="relative flex flex-col md:flex-row items-center justify-between px-6 md:px-16 py-20 bg-[url('/bg-heromenu.png')] bg-cover bg-center"
      >
        <div className="max-w-2xl text-center md:text-left">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900">
            Begin your day with <br />
            a <span className="text-orange-600">perfect cup of coffee</span>
          </h1>
          <p className="mt-4 text-lg text-gray-700">
            Setting a positive tone with its comforting warmth and invigorating
            flavor
          </p>
        </div>
        <div className="w-full md:w-[600px] lg:w-[700px] h-[400px] md:h-[500px] relative flex justify-center">
          <Image
            src="/CaramelFrappucino.png"
            alt="Coffee Cup"
            layout="fill"
            objectFit="contain"
          />
        </div>
      </section>

      {/* Menu Section */}
      <div
        className="py-12 px-6 md:px-16 bg-[url('/bg-hero1.png')] bg-cover bg-center"
      >
        <h2 className="text-4xl font-extrabold text-center text-orange-600 mb-8">
          Our Popular Menu
        </h2>
        <h2 className="text-2xl text-white mb-4">Table Number: {tableNumber}</h2>

        {/* Category Buttons */}
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

        {/* Menu Items */}
        {loading ? (
          <p className="text-center text-gray-500">Loading menu...</p>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : selectedCategory === "Bundle" ? (
          // Tampilkan bundle jika kategori "Bundle" dipilih
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBundle.map((bundle) => (
              <div
                key={bundle.id}
                className="relative border p-5 rounded-2xl shadow-2xl bg-white transition-all duration-300 transform hover:scale-105 hover:shadow-2xl overflow-hidden"
              >
                {/* Layout untuk Desktop */}
                <div className="hidden sm:block">
                  <div className="relative w-full h-64 cursor-pointer hover:scale-105 transition-transform">
                    <Image
                      src={bundle.image}
                      alt={bundle.name}
                      layout="fill"
                      objectFit="cover"
                      className="rounded-lg"
                    />
                  </div>
                  <div className="p-4 text-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {bundle.name}
                    </h2>
                    <p className="text-gray-600 text-left">
                      {bundle.description}
                    </p>
                    <p className="text-lg font-semibold text-orange-600 mt-2 text-left">
                      Rp{bundle.bundlePrice?.toLocaleString()}
                    </p>
                    <button
                      onClick={() => addToCartBundle(bundle)}
                      className="mt-4 px-6 py-3 bg-orange-600 text-white rounded-full text-lg font-semibold hover:bg-orange-700 transition flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      Add to Cart
                    </button>
                  </div>
                </div>

                {/* Layout untuk Mobile */}
                <div className="sm:hidden flex items-center gap-4">
                  <div className="relative w-24 h-24 flex-shrink-0">
                    <Image
                      src={bundle.image}
                      alt={bundle.name}
                      layout="fill"
                      objectFit="cover"
                      className="rounded-lg"
                    />
                  </div>
                  <div className="flex-grow">
                    <h2 className="text-lg font-bold text-gray-900">
                      {bundle.name}
                    </h2>
                    <p className="text-sm text-gray-600">{bundle.description}</p>
                    <p className="text-md font-semibold text-orange-600 mt-1">
                      Rp{bundle.bundlePrice?.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => addToCartBundle(bundle)}
                    className="p-2 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : filteredMenu.length === 0 ? (
          <p className="text-center text-gray-500">
            No menu available for this category.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredMenu.map((item) => (
              <div
                key={item.id}
                className="relative border p-5 rounded-2xl shadow-2xl bg-white transition-all duration-300 transform hover:scale-105 hover:shadow-2xl overflow-hidden"
              >
                {/* Layout untuk Desktop */}
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
                    <h2 className="text-2xl font-bold text-gray-900">
                      {item.name}
                    </h2>
                    <p className="text-gray-600 text-left">
                      {item.description}
                    </p>
                    <p className="text-lg font-semibold text-orange-600 mt-2 text-left">
                      Rp{item.price.toLocaleString()}
                    </p>
                    <p className="text-lg font-semibold text-orange-600 mt-2 text-left">
                      Max Beli : {item.maxBeli.toLocaleString()}
                    </p>
                    <button
                      onClick={() => addToCart(item)}
                      className="mt-4 px-6 py-3 bg-orange-600 text-white rounded-full text-lg font-semibold hover:bg-orange-700 transition flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      Add to Cart
                    </button>
                  </div>
                </div>

                {/* Layout untuk Mobile */}
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
                    <h2 className="text-lg font-bold text-gray-900">
                      {item.name}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {item.description}
                    </p>
                    <p className="text-md font-semibold text-orange-600 mt-1">
                      Rp{item.price.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => addToCart(item)}
                    className="p-2 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      <button
        onClick={() => setIsCartOpen(true)}
        className="fixed bottom-4 left-4 bg-orange-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-orange-700 transition flex items-center justify-center gap-3"
      >
        <ShoppingCart className="w-6 h-6" />
        {cart.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
            {cart.length}
          </span>
        )}
        <span className="hidden sm:block">Cart</span>
        <div className="sm:hidden flex flex-col items-center">
          <span className="text-sm font-semibold">
            Rp
            {cart
              .reduce((total, item) => {
                if (item.type === "menu")
                  return total + item.item.price * item.quantity;
                else
                  return total + ((item.item.bundlePrice || 0) * item.quantity);
              }, 0)
              .toLocaleString()}
          </span>
          <span className="text-xs">Checkout</span>
        </div>
      </button>

      {/* Cart Popup */}
      {isCartOpen && (
        <div className="fixed top-0 right-0 w-full md:w-1/3 h-full bg-white shadow-lg p-6 overflow-y-auto z-50 flex flex-col">
          <div className="flex justify-between items-center border-b pb-4 mb-4">
            <h2 className="text-2xl font-bold text-orange-600">Your Cart</h2>
            <button onClick={() => setIsCartOpen(false)}>
              <X className="w-6 h-6 text-gray-800 hover:text-orange-600" />
            </button>
          </div>

          {cart.length === 0 ? (
            <p className="text-center text-gray-500 flex-grow">
              Your cart is empty.
            </p>
          ) : (
            <>
              {/* List Item Keranjang */}
              <div className="flex-grow overflow-y-auto">
                <ul className="space-y-4">
                  {cart.map((item) => {
                    if (item.type === "menu") {
                      const itemTotalPrice = item.item.price * item.quantity;
                      const isNoteOpen =
                        noteVisibility[item.item.id] || false;
                      return (
                        <li
                          key={`menu-${item.item.id}`}
                          className="flex flex-col border-b pb-4"
                        >
                          <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {item.item.name}
                            </h3>
                            <p className="text-orange-600 font-semibold">
                              Rp{item.item.price.toLocaleString()} x{" "}
                              {item.quantity}
                            </p>
                          </div>
                          <p className="text-right text-gray-700 font-semibold">
                            Total: Rp{itemTotalPrice.toLocaleString()}
                          </p>
                          <div className="flex justify-between items-center mt-2">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() =>
                                  removeFromCart(item.item.id, "menu")
                                }
                                className="px-4 py-2 bg-red-500 text-white text-lg font-bold rounded-full shadow-md hover:bg-red-700 transition"
                              >
                                −
                              </button>
                              <span className="text-xl font-bold min-w-[40px] text-center text-black">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => addToCart(item.item)}
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
                              onChange={(e) =>
                                updateCartItemNote(
                                  item.item.id,
                                  "menu",
                                  e.target.value
                                )
                              }
                            />
                          ) : (
                            <button
                              onClick={() => toggleNoteVisibility(item.item.id)}
                              className="mt-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm hover:bg-gray-300 transition"
                            >
                              Add Note
                            </button>
                          )}
                        </li>
                      );
                    } else {
                      // Untuk item bundle
                      const bundlePrice = item.item.bundlePrice || 0;
                      const itemTotalPrice = bundlePrice * item.quantity;
                      const noteKey = `bundle-${item.item.id}`;
                      const isNoteOpen = noteVisibility[noteKey] || false;
                      return (
                        <li
                          key={`bundle-${item.item.id}`}
                          className="flex flex-col border-b pb-4"
                        >
                          <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {item.item.name} (Bundle)
                            </h3>
                            <p className="text-orange-600 font-semibold">
                              Rp{bundlePrice.toLocaleString()} x{" "}
                              {item.quantity}
                            </p>
                          </div>
                          <p className="text-right text-gray-700 font-semibold">
                            Total: Rp{itemTotalPrice.toLocaleString()}
                          </p>
                          <div className="flex justify-between items-center mt-2">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() =>
                                  removeFromCart(item.item.id, "bundle")
                                }
                                className="px-4 py-2 bg-red-500 text-white text-lg font-bold rounded-full shadow-md hover:bg-red-700 transition"
                              >
                                −
                              </button>
                              <span className="text-xl font-bold min-w-[40px] text-center text-black">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => addToCartBundle(item.item)}
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
                              onChange={(e) =>
                                updateCartItemNote(
                                  item.item.id,
                                  "bundle",
                                  e.target.value
                                )
                              }
                            />
                          ) : (
                            <button
                              onClick={() =>
                                toggleNoteVisibility(noteKey)
                              }
                              className="mt-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm hover:bg-gray-300 transition"
                            >
                              Add Note
                            </button>
                          )}
                        </li>
                      );
                    }
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
              {/* Total Harga */}
              <div className="p-4 bg-gray-100 rounded-lg mt-auto">
                <h3 className="text-xl font-bold text-gray-900">
                  Total Harga:
                </h3>
                <p className="text-2xl text-orange-600 font-semibold">
                  Rp
                  {cart
                    .reduce((total, item) => {
                      if (item.type === "menu")
                        return total + item.item.price * item.quantity;
                      else
                        return (
                          total + ((item.item.bundlePrice || 0) * item.quantity)
                        );
                    }, 0)
                    .toLocaleString()}
                </p>
                <button
                  onClick={placeOrder}
                  className="mt-4 w-full px-6 py-3 bg-orange-600 text-white rounded-full text-lg font-semibold hover:bg-orange-700 transition"
                >
                  Pesan Sekarang
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Ringkasan Pesanan */}
      {showOrderSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold text-orange-600 mb-4">
              Order Summary
            </h2>
            <h3 className="text-1xl text-black mb-4">
              Table Number: {tableNumber}
            </h3>
            <ul className="space-y-2">
              {cart.map((item) =>
                item.type === "menu" ? (
                  <li
                    key={`menu-${item.item.id}`}
                    className="flex justify-between text-black"
                  >
                    <span>
                      {item.quantity}x {item.item.name}
                    </span>
                    <span>
                      Rp{(item.item.price * item.quantity).toLocaleString()}
                    </span>
                  </li>
                ) : (
                  <li
                    key={`bundle-${item.item.id}`}
                    className="flex justify-between text-black"
                  >
                    <span>
                      {item.quantity}x {item.item.name} (Bundle)
                    </span>
                    <span>
                      Rp
                      {((item.item.bundlePrice || 0) * item.quantity).toLocaleString()}
                    </span>
                  </li>
                )
              )}
            </ul>
            <div className="mt-4 border-t pt-4">
              <p className="text-lg font-semibold text-black">
                Total: Rp
                {cart
                  .reduce((total, item) => {
                    if (item.type === "menu")
                      return total + item.item.price * item.quantity;
                    else
                      return (
                        total + ((item.item.bundlePrice || 0) * item.quantity)
                      );
                  }, 0)
                  .toLocaleString()}
              </p>
            </div>
            <p className="mt-4 text-center text-red-600 font-semibold">
              Silakan menuju kasir untuk membayar agar pesanan Anda diproses.
            </p>
            <button
              onClick={handleCloseOrderSummary}
              className="mt-4 w-full px-6 py-3 bg-orange-600 text-white rounded-full text-lg font-semibold hover:bg-orange-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Error Popup */}
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
