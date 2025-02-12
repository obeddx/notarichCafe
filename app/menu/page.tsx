"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { ShoppingCart, X } from "lucide-react";
import toast, { Toaster } from "react-hot-toast"; // Import react-hot-toast

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

const categories = [
  "Coffee", "Tea", "Frappe", "Juice", "Milk Base",
  "Refresher", "Cocorich", "Mocktail", "Snack", "Main Course"
];

export default function MenuPage() {
  const [selectedCategory, setSelectedCategory] = useState("Coffee");
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<Menu[]>([]);
  const [tableNumber, setTableNumber] = useState<string>("1"); // Default nomor meja
  const [isCartOpen, setIsCartOpen] = useState(false); // State untuk pop-up keranjang

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

  useEffect(() => {
    // Load cart dari sessionStorage saat komponen di-mount
    const storedCart = sessionStorage.getItem(`cart_table_${tableNumber}`);
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }
  }, [tableNumber]);

  const addToCart = (menu: Menu) => {
    const updatedCart = [...cart, menu];
    setCart(updatedCart);
    sessionStorage.setItem(`cart_table_${tableNumber}`, JSON.stringify(updatedCart));
    toast.success(`${menu.name} added to cart!`);
    setIsCartOpen(true); // Buka pop-up keranjang saat item ditambahkan
  };

  const removeFromCart = (menuId: number) => {
    const updatedCart = cart.filter(item => item.id !== menuId);
    setCart(updatedCart);
    sessionStorage.setItem(`cart_table_${tableNumber}`, JSON.stringify(updatedCart));
  };

  const filteredMenu = menus.filter((item) =>
    item.category.toLowerCase().includes(selectedCategory.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <Toaster position="top-right" reverseOrder={false} /> {/* Notifikasi */}

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
        ) : filteredMenu.length === 0 ? (
          <p className="text-center text-gray-500">No menu available for this category.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredMenu.map((item) => (
              <div
                key={item.id}
                className="relative border p-5 rounded-2xl shadow-2xl bg-white transition-all duration-300 transform hover:scale-105 hover:shadow-2xl overflow-hidden"
              >
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
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      <button
        onClick={() => setIsCartOpen(true)}
        className="fixed bottom-4 left-4 bg-orange-600 text-white p-4 rounded-full shadow-lg hover:bg-orange-700 transition flex items-center justify-center z-50"
      >
        <ShoppingCart className="w-6 h-6" />
      </button>

      {/* Cart Popup */}
      {isCartOpen && (
        <div className="fixed top-0 right-0 w-full md:w-1/3 h-full bg-white shadow-lg p-6 overflow-y-auto z-50">
          <div className="flex justify-between items-center border-b pb-4 mb-4">
            <h2 className="text-2xl font-bold text-orange-600">Your Cart</h2>
            <button onClick={() => setIsCartOpen(false)}>
              <X className="w-6 h-6 text-gray-800 hover:text-orange-600" />
            </button>
          </div>

          {cart.length === 0 ? (
            <p className="text-center text-gray-500">Your cart is empty.</p>
          ) : (
            <ul className="space-y-4">
              {cart.map((item) => (
                <li key={item.id} className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-orange-600">Rp{item.price.toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
