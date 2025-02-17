"use client";
import { useState, FormEvent } from "react";
import toast, { Toaster } from "react-hot-toast";

export default function CreateIngredient() {
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
    <>
      <div className="max-w-md mx-auto p-6 bg-white rounded shadow-md mt-10">
        <h1 className="text-xl font-bold mb-4 text-center">Create Ingredient</h1>
        <form onSubmit={handleSubmit}>
          {/* Input Name */}
          <div className="mb-4">
            <label className="block font-medium mb-1">Name:</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border border-gray-300 rounded" required />
          </div>

          {/* Row untuk Start dan Start Gudang */}
          <div className="mb-4 flex gap-4">
            <div className="w-1/2">
              <label className="block font-medium mb-1">Start:</label>
              <input type="number" value={start} onChange={(e) => setStart(e.target.value)} className="w-full p-2 border border-gray-300 rounded" required step="any" />
            </div>
            <div className="w-1/2">
              <label className="block font-medium mb-1">Start Gudang:</label>
              <input type="number" value={warehouseStart} onChange={(e) => setWarehouseStart(e.target.value)} className="w-full p-2 border border-gray-300 rounded" required step="any" />
            </div>
          </div>

          {/* Row untuk Ingredient Unit dan Unit Price */}
          <div className="mb-4 flex gap-4">
            <div className="w-1/2">
              <label className="block font-medium mb-1">Ingredient Unit:</label>
              <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full p-2 border border-gray-300 rounded" placeholder="e.g., bottle, pack" required />
            </div>
            <div className="w-1/2">
              <label className="block font-medium mb-1">Unit Price:</label>
              <input type="text" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="w-full p-2 border border-gray-300 rounded" placeholder="e.g., 100g, 50g" required />
            </div>
          </div>

          {/* Row untuk Price */}
          <div className="mb-4">
            <label className="block font-medium mb-1">Price:</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-2 border border-gray-300 rounded" required step="any" placeholder="Price per unit price" />
          </div>

          {/* Input Stock Min */}
          <div className="mb-4">
            <label className="block font-medium mb-1">Stock Min:</label>
            <input type="number" value={stockMin} onChange={(e) => setStockMin(e.target.value)} className="w-full p-2 border border-gray-300 rounded" required step="any" />
          </div>

          {/* Input Stock In (readonly) */}
          <div className="mb-4">
            <label className="block font-medium mb-1">Stock In:</label>
            <input type="number" value={stockIn} readOnly className="w-full p-2 border border-gray-300 rounded bg-gray-100" required step="any" />
          </div>

          {/* Input Used (readonly) */}
          <div className="mb-4">
            <label className="block font-medium mb-1">Used:</label>
            <input type="number" value={used} readOnly className="w-full p-2 border border-gray-300 rounded bg-gray-100" required step="any" />
          </div>

          {/* Input Wasted (readonly) */}
          <div className="mb-4">
            <label className="block font-medium mb-1">Wasted:</label>
            <input type="number" value={wasted} readOnly className="w-full p-2 border border-gray-300 rounded bg-gray-100" required step="any" />
          </div>

          <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded">
            Create Ingredient
          </button>
        </form>
      </div>
      <Toaster position="top-right" />
    </>
  );
}
