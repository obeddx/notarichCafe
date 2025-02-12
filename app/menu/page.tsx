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

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch("/api/getMenu");
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        
        console.log("Fetched Menu Data:", data); // Debugging API response

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
        setError(null);
      } catch (err) {
        setError("Failed to load menu data.");
        console.error("Error fetching menu data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, []);

  // Debugging kategori
  console.log("Selected Category:", selectedCategory);
  console.log("Menus:", menus);

  const filteredMenu = menus.filter((item) =>
    item.category.toLowerCase().includes(selectedCategory.toLowerCase())
  );

  console.log("Filtered Menu:", filteredMenu);

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
        </div>
      </section>

      <div className="py-12 px-6 md:px-16 bg-[url('/bg-hero1.png')] bg-cover bg-center">
        <h2 className="text-4xl font-extrabold text-center text-orange-600 mb-8">
          Our Popular Menu
        </h2>

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
            {filteredMenu.map((item) => (
              <div
                key={item.id}
                className="relative border p-5 rounded-2xl shadow-2xl bg-white transition-all duration-300 transform hover:scale-105 hover:shadow-2xl overflow-hidden"
              >
                <div className="relative w-full h-48">
                  <Image
                    src={item.image.startsWith("/uploads/") ? item.image : "/default-image.jpg"}
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
