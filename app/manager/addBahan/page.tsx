"use client";
import { useState, FormEvent } from "react";
import toast, { Toaster } from "react-hot-toast";
import Sidebar from "@/components/sidebar";

export default function CreateIngredient() {
  // State untuk Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  // State untuk form ingredient
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [warehouseStart, setWarehouseStart] = useState("");
  // Field dengan nilai default yang tidak diubah
  const [stockIn] = useState("0");
  const [used] = useState("0");
  const [wasted] = useState("0");
  const [stockMin, setStockMin] = useState("");
  // Unit untuk ingredient (misalnya: botol, pack)
  const [unit, setUnit] = useState("");
  // Field untuk harga (angka)
  const [price, setPrice] = useState("");
  // State untuk unit harga yang berkaitan (misalnya: "100g", "50g")
  const [unitPrice, setUnitPrice] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validasi bahwa semua field yang diperlukan telah diisi
    if (!name || !start || !warehouseStart || !stockMin || !unit || !price || !unitPrice) {
      toast.error("Semua field harus diisi!");
      return;
    }

    const data = {
      name,
      start: parseFloat(start),
      warehouseStart: parseFloat(warehouseStart),
      stockIn: parseFloat(stockIn),
      used: parseFloat(used),
      wasted: parseFloat(wasted),
      stockMin: parseFloat(stockMin),
      unit, // Unit untuk Ingredient
      price: parseFloat(price),
      unitPrice, // Unit harga untuk IngredientPrice
    };

    try {
      const res = await fetch("/api/addBahan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (res.ok) {
        toast.success(result.toast.text);
        // Reset field yang bisa diubah user
        setName("");
        setStart("");
        setWarehouseStart("");
        setStockMin("");
        setUnit("");
        setPrice("");
        setUnitPrice("");
      } else {
        toast.error(result.message || "Gagal membuat ingredient.");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Terjadi kesalahan saat membuat ingredient.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-200 to-amber-700">
      {/* Sidebar */}
      <Sidebar onToggle={toggleSidebar} isOpen={isSidebarOpen} />

      <div
        className="p-4 mt-20 transition-all"
        style={{ marginLeft: isSidebarOpen ? "256px" : "80px" }}
      >
        <div className="max-w-lg mx-auto bg-white p-8 rounded-xl shadow-lg">
          <h1 className="text-2xl font-bold text-center mb-6">Create Ingredient</h1>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Input Name */}
            <div>
              <label className="block font-semibold mb-1">Name:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                placeholder="Masukkan nama ingredient"
                required
              />
            </div>

            {/* Row untuk Start dan Start Gudang */}
            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block font-semibold mb-1">Start:</label>
                <input
                  type="number"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                  required
                  step="any"
                  placeholder="0"
                />
              </div>
              <div className="w-1/2">
                <label className="block font-semibold mb-1">Start Gudang:</label>
                <input
                  type="number"
                  value={warehouseStart}
                  onChange={(e) => setWarehouseStart(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                  required
                  step="any"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Row untuk Ingredient Unit dan Unit Price */}
            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block font-semibold mb-1">Ingredient Unit:</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                  placeholder="e.g., bottle, pack"
                  required
                />
              </div>
              <div className="w-1/2">
                <label className="block font-semibold mb-1">Satuan Harga:</label>
                <input
                  type="text"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                  placeholder="e.g., 100 gram, 1 botol"
                  required
                />
              </div>
            </div>

            {/* Input Price */}
            <div>
              <label className="block font-semibold mb-1">Price:</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                required
                step="any"
                placeholder="Harga per satuan harga"
              />
            </div>

            {/* Input Stock Min */}
            <div>
              <label className="block font-semibold mb-1">Stock Min:</label>
              <input
                type="number"
                value={stockMin}
                onChange={(e) => setStockMin(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                required
                step="any"
                placeholder="Minimal stok"
              />
            </div>

            {/* Input Stock In (readonly) */}
            <div>
              <label className="block font-semibold mb-1">Stock In:</label>
              <input
                type="number"
                value={stockIn}
                readOnly
                className="w-full p-3 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                required
                step="any"
              />
            </div>

            {/* Input Used (readonly) */}
            <div>
              <label className="block font-semibold mb-1">Used:</label>
              <input
                type="number"
                value={used}
                readOnly
                className="w-full p-3 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                required
                step="any"
              />
            </div>

            {/* Input Wasted (readonly) */}
            <div>
              <label className="block font-semibold mb-1">Wasted:</label>
              <input
                type="number"
                value={wasted}
                readOnly
                className="w-full p-3 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                required
                step="any"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-md transition-colors"
            >
              Create Ingredient
            </button>
          </form>
        </div>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}
