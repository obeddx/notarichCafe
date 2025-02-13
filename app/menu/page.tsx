"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { ShoppingCart, X } from "lucide-react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { useSearchParams, useRouter } from "next/navigation";

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
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  // Ambil nilai tableNumber dari URL atau sessionStorage
  useEffect(() => {
    const tableFromUrl = searchParams?.get("table");
    const tableFromSession = sessionStorage.getItem("tableNumber");
    const finalTableNumber = tableFromUrl || tableFromSession || "Unknown";
    setTableNumber(finalTableNumber);

    // Jika didapat dari URL, simpan ke sessionStorage
    if (tableFromUrl) {
      sessionStorage.setItem("tableNumber", tableFromUrl);
    }
  }, [searchParams]);

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
        }));

        setMenus(transformedMenu);
      } catch (err) {
        setError("Failed to load menu data.");
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, []);

  // Tambahkan item ke keranjang
  const addToCart = (menu: Menu) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (item) => item.menu.id === menu.id
      );

      let updatedCart;
      if (existingItemIndex !== -1) {
        // Jika item sudah ada, tambahkan quantity
        updatedCart = prevCart.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        // Jika belum ada, tambahkan item baru
        updatedCart = [...prevCart, { menu, quantity: 1, note: "" }];
      }

      // Inisialisasi noteVisibility untuk item baru
      setNoteVisibility((prev) => ({
        ...prev,
        [menu.id]: false, // Default visibility untuk item baru
      }));

      sessionStorage.setItem(
        `cart_table_${tableNumber}`,
        JSON.stringify(updatedCart)
      );
      return updatedCart;
    });

    toast.success(`${menu.name} added to cart!`); // Notifikasi di halaman menu
  };

  // Hapus item dari keranjang
  const removeFromCart = (menuId: number) => {
    setCart((prevCart) => {
      const updatedCart = prevCart
        .map((item) => {
          if (item.menu.id === menuId) {
            if (item.quantity > 1) {
              return { ...item, quantity: item.quantity - 1 };
            }
            return null; // Jika quantity 1, hapus item
          }
          return item;
        })
        .filter(Boolean) as CartItem[];

      // Hapus noteVisibility untuk item yang dihapus
      setNoteVisibility((prev) => {
        const newVisibility = { ...prev };
        delete newVisibility[menuId];
        return newVisibility;
      });

      sessionStorage.setItem(
        `cart_table_${tableNumber}`,
        JSON.stringify(updatedCart)
      );
      return updatedCart;
    });
    toast.error("Item removed from cart!");
  };

  // Update note untuk item di keranjang
  const updateCartItemNote = (menuId: number, note: string) => {
    setCart((prevCart) => {
      const updatedCart = prevCart.map((item) =>
        item.menu.id === menuId ? { ...item, note } : item
      );
      sessionStorage.setItem(
        `cart_table_${tableNumber}`,
        JSON.stringify(updatedCart)
      );
      return updatedCart;
    });
  };

  // Fungsi untuk mengontrol visibilitas catatan
  const toggleNoteVisibility = (menuId: number) => {
    setNoteVisibility((prev) => ({
      ...prev,
      [menuId]: !prev[menuId], // Toggle visibility
    }));
  };

  // Kirim pesanan ke sistem kasir
  const placeOrder = async () => {
    const orderDetails = {
      tableNumber,
      items: cart.map((item) => ({
        menuId: item.menu.id,
        quantity: item.quantity,
        note: item.note,
      })),
      total: cart.reduce((total, item) => total + item.menu.price * item.quantity, 0),
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
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      toast.success("Order placed successfully!");
      setShowOrderSummary(true); // Tampilkan ringkasan pesanan
      setIsCartOpen(false);
    } catch (err) {
      setOrderError("Failed to place order. Please try again later."); // Set pesan error
      toast.error("Failed to place order. Please try again later."); // Notifikasi error
    }
  };

  const handleCloseOrderSummary = () => {
    setShowOrderSummary(false); // Tutup ringkasan pesanan
    setCart([]); // Hapus cart
    sessionStorage.removeItem(`cart_table_${tableNumber}`); // Hapus cart dari sessionStorage
  };

  // Filter menu berdasarkan kategori yang dipilih
  // Filter menu berdasarkan kategori yang dipilih
  const filteredMenu = selectedCategory === "All Menu"
    ? menus // Tampilkan semua menu jika "All Menu" dipilih
    : menus.filter((item) =>
      item.category.toLowerCase().includes(selectedCategory.toLowerCase())
    );

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
          <Image
            src="/CaramelFrappucino.png"
            alt="Coffee Cup"
            layout="fill"
            objectFit="contain"
          />
        </div>
      </section>

      {/* Menu Section */}
      <div className="py-12 px-6 md:px-16 bg-[url('/bg-hero1.png')] bg-cover bg-center">
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
              className={`whitespace-nowrap px-6 py-3 rounded-full text-lg font-semibold transition-all transform duration-300 shadow-lg ${selectedCategory === category
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
                    <h2 className="text-2xl font-bold text-gray-900">{item.name}</h2>
                    <p className="text-gray-600 text-left">{item.description}</p>
                    <p className="text-lg font-semibold text-orange-600 mt-2 text-left">
                      Rp{item.price.toLocaleString()}
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
                  {/* Gambar */}
                  <div className="relative w-24 h-24 flex-shrink-0">
                    <Image
                      src={item.image}
                      alt={item.name}
                      layout="fill"
                      objectFit="cover"
                      className="rounded-lg"
                    />
                  </div>

                  {/* Informasi Menu */}
                  <div className="flex-grow">
                    <h2 className="text-lg font-bold text-gray-900">{item.name}</h2>
                    <p className="text-sm text-gray-600">{item.description}</p>
                    <p className="text-md font-semibold text-orange-600 mt-1">
                      Rp{item.price.toLocaleString()}
                    </p>
                  </div>

                  {/* Tombol + */}
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
        {/* Badge untuk jumlah item di keranjang */}
        {cart.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
            {cart.reduce((total, item) => total + item.quantity, 0)}
          </span>
        )}

        <span className="hidden sm:block">Cart</span>
        {/* Tampilkan total harga dan tulisan Checkout di mobile */}
        <div className="sm:hidden flex flex-col items-center">
          <span className="text-sm font-semibold">
            Rp{cart.reduce((total, item) => total + item.menu.price * item.quantity, 0).toLocaleString()}
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
            <p className="text-center text-gray-500 flex-grow">Your cart is empty.</p>
          ) : (
            <>
              {/* List Item Keranjang */}
              <div className="flex-grow overflow-y-auto">
                <ul className="space-y-4">
                  {cart.map((item) => {
                    const itemTotalPrice = item.menu.price * item.quantity;
                    const isNoteOpen = noteVisibility[item.menu.id] || false;

                    return (
                      <li key={item.menu.id} className="flex flex-col border-b pb-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {item.menu.name}
                          </h3>
                          <p className="text-orange-600 font-semibold">
                            Rp{item.menu.price.toLocaleString()} x {item.quantity}
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

                        {/* Tombol Add Note dan Textarea */}
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

              {/* Total Harga */}
              <div className="p-4 bg-gray-100 rounded-lg mt-auto">
                <h3 className="text-xl font-bold text-gray-900">Total Harga:</h3>
                <p className="text-2xl text-orange-600 font-semibold">
                  Rp
                  {cart
                    .reduce((total, item) => total + item.menu.price * item.quantity, 0)
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
            <h2 className="text-2xl font-bold text-orange-600 mb-4">Order Summary</h2>
            <h3 className="text-1xl text-black mb-4">Table Number: {tableNumber}</h3>
            <ul className="space-y-2">
              {cart.map((item) => (
                <li key={item.menu.id} className="flex justify-between text-black">
                  <span>{item.quantity}x {item.menu.name}</span>
                  <span>Rp{(item.menu.price * item.quantity).toLocaleString()}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t pt-4">
              <p className="text-lg font-semibold text-black">
                Total: Rp{cart.reduce((total, item) => total + item.menu.price * item.quantity, 0).toLocaleString()}
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