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
    <div className="min-h-screen">
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
          <div className="mt-6 flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-4">
            <button className="px-6 py-3 bg-orange-600 text-white font-bold rounded-full shadow-md hover:bg-orange-500 transition">
              ☕ Order Online
            </button>
            <button className="px-6 py-3 border-2 border-orange-600 text-orange-600 font-bold rounded-full shadow-md hover:bg-orange-600 hover:text-white transition">
              See more menu
            </button>
          </div>
        </div>

        {/* Gambar Minuman */}
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

      {/* Menu Section */}
      <div className="py-12 px-6 md:px-16 bg-[url('/bg-hero1.png')] bg-cover bg-center">
        <h2 className="text-4xl font-extrabold text-center text-orange-600 mb-8">Our Popular Menu</h2>
        
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

              {/* Tombol Tambah ke Keranjang */}
              <button
                className="w-full py-3 bg-orange-500 text-white font-bold rounded-b-2xl transition duration-300 hover:bg-orange-600 flex justify-center items-center"
              >
                🛒 Tambahkan ke Keranjang
              </button>
            </div>
          ))}
        </div> 
      </div>
    </div>
  );
}
