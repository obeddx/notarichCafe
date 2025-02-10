"use client";
import { useState } from "react";
import Image from "next/image";

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  rating: number;
  stock: boolean;
}

const menuData: MenuItem[] = [
  { id: 1, name: "Nasi Goreng", description: "Nasi goreng spesial dengan topping ayam.", price: 25000, image: "/nasi-goreng.jpg", category: "Makanan", rating: 4.5, stock: true },
  { id: 2, name: "Es Teh Manis", description: "Teh manis dingin menyegarkan.", price: 5000, image: "/es-teh.jpg", category: "Minuman", rating: 4.2, stock: true },
  { id: 3, name: "Brownies Coklat", description: "Brownies lembut dengan coklat pekat.", price: 20000, image: "/brownies.jpg", category: "Dessert", rating: 4.7, stock: false },
  { id: 4, name: "Mie Ayam", description: "Mie ayam dengan pangsit goreng.", price: 22000, image: "/mie-ayam.jpg", category: "Makanan", rating: 4.6, stock: true },
  { id: 5, name: "Kopi Hitam", description: "Kopi hitam panas dengan aroma khas.", price: 10000, image: "/kopi-hitam.jpg", category: "Minuman", rating: 4.3, stock: true },
  { id: 6, name: "Cheesecake", description: "Cheesecake lembut dengan topping buah.", price: 30000, image: "/cheesecake.jpg", category: "Dessert", rating: 4.8, stock: true },
];

const categories = ["Makanan", "Minuman", "Dessert"];

export default function MenuPage() {
  const [selectedCategory, setSelectedCategory] = useState("Makanan");

  const filteredMenu = menuData.filter((item) => item.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f3e5ab] via-[#d4a373] to-[#8b5e34] py-12 px-6 mt-16">
      <div className="max-w-6xl mx-auto bg-white/90 shadow-lg rounded-lg p-10">
        {/* Header dengan Gradien Warna */}
        <h1 className="text-4xl font-extrabold text-center bg-gradient-to-r from-orange-600 to-red-500 text-transparent bg-clip-text mb-8">
          Menu Lezat Kami 🍽️
        </h1>

        {/* Kategori dengan Efek Hover */}
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

        {/* Daftar Menu */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredMenu.map((item) => (
            <div
              key={item.id}
              className="relative border p-5 rounded-lg shadow-xl bg-white transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
            >
              {/* Gambar */}
              <div className="relative w-full h-48">
                <Image
                  src={item.image}
                  alt={item.name}
                  layout="fill"
                  objectFit="cover"
                  className="rounded-lg"
                />
              </div>

              {/* Informasi Menu */}
              <h2 className="text-2xl font-bold mt-4">{item.name}</h2>
              <p className="text-gray-600">{item.description}</p>
              <p className="text-lg font-semibold text-orange-600 mt-2">
                Rp{item.price.toLocaleString()}
              </p>

              {/* Rating & Ketersediaan */}
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-gray-500">⭐ {item.rating}</span>
                {item.stock ? (
                  <span className="text-green-600 font-medium">Tersedia</span>
                ) : (
                  <span className="text-red-600 font-medium">Habis</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
