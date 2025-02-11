"use client";
import { useState, useEffect } from "react";
import Image from "next/image";

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

// Perluas interface Menu untuk menyertakan field tambahan secara manual:
interface Menu {
  id: number;
  name: string;
  image: string;
  description?: string;
  price: number;
  ingredients: MenuIngredient[];
  // Field tambahan (tidak ada di database, diisi manual)
  category: string;
  rating: number;
  stock: boolean;
}

const categories = [
  "Coffee", "Tea", "Frappe", "Juice", "Milk Base", "Refresher", "Cocorich", "Mocktail", "Snack", "Main Course"
];

export default function MenuPage() {
  const [selectedCategory, setSelectedCategory] = useState("Coffee");
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch("/api/getMenu");
        const data = await response.json();
        const menuArray = data.menu || data;
        const transformedMenu: Menu[] = menuArray.map((item: any) => ({
          ...item,
          category: item.category,
          rating: item.rating !== undefined ? item.rating : 4.5,
          stock: item.stock !== undefined ? item.stock : true,
        }));
        setMenus(transformedMenu);
      } catch (error) {
        console.error("Error fetching menu data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, []);

  const filteredMenu = menus.filter(
    (item) => item.category.toLowerCase() === selectedCategory.toLowerCase()
  );

  return (
    <div className="min-h-screen">
      <section className="relative flex flex-col md:flex-row items-center justify-between px-6 md:px-16 py-20 bg-[url('/bg-heromenu.png')] bg-cover bg-center">
        <div className="max-w-2xl text-center md:text-left">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900">
            Begin your day with <br />
            a <span className="text-orange-600">perfect cup of coffee</span>
          </h1>
          <p className="mt-4 text-lg text-gray-700">
            Setting a positive tone with its comforting warmth and invigorating flavor
          </p>
          <div className="mt-6 flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-4">
            <button className="px-6 py-3 bg-orange-600 text-white font-bold rounded-full shadow-md hover:bg-orange-500 transition">
              ☕ Order Online
            </button>
            <button className="px-6 py-3 border-2 border-orange-600 text-orange-600 font-bold rounded-full shadow-md hover:bg-orange-600 hover:text-white transition">
              See more menu
            </button>
          </div>
        </div>
        <div className="relative flex justify-center w-full md:w-auto mt-10 md:mt-0">
          <Image
            src="/frappu-transparent.png"
            alt="Delicious coffee"
            width={300}
            height={300}
            className="max-w-xs md:max-w-sm object-contain drop-shadow-lg animate-float"
          />
        </div>
      </section>

      <div className="py-12 px-6 md:px-16 bg-[url('/bg-hero1.png')] bg-cover bg-center">
        <h2 className="text-4xl font-extrabold text-center text-orange-600 mb-8">
          Our Popular Menu
        </h2>

        <div className="flex justify-center space-x-4 mb-8">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-3 rounded-full text-lg font-semibold transition-all transform duration-300 shadow-lg ${
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredMenu.map((item) => (
              <div
                key={item.id}
                className="relative border p-5 rounded-2xl shadow-2xl bg-white transition-all duration-300 transform hover:scale-105 hover:shadow-2xl overflow-hidden"
              >
                <div className="relative w-full h-48">
                  <Image
                    src={item.image}
                    alt={item.name}
                    layout="fill"
                    objectFit="cover"
                    className="rounded-lg"
                  />
                </div>

                <div className="p-4">
                  <h2 className="text-2xl font-bold text-gray-900">{item.name}</h2>
                  <p className="text-gray-600">{item.description}</p>
                  <p className="text-lg font-semibold text-orange-600 mt-2">
                    Rp{item.price.toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center justify-between px-4 mb-4">
                  <span className="text-sm text-gray-500">⭐ {item.rating}</span>
                  {item.stock ? (
                    <span className="text-green-600 font-medium">Tersedia</span>
                  ) : (
                    <span className="text-red-600 font-medium">Habis</span>
                  )}
                </div>

                <button className="w-full py-3 bg-orange-500 text-white font-bold rounded-b-2xl transition duration-300 hover:bg-orange-600 flex justify-center items-center">
                  🛒 Tambahkan ke Keranjang
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
