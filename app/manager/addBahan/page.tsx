'use client';
import { useState, FormEvent } from "react";
import toast, { Toaster } from "react-hot-toast";
import Sidebar from "@/components/sidebar";

export default function CreateIngredient() {
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [warehouseStart, setWarehouseStart] = useState("");
  // Set nilai default 0 dan tidak mengubahnya
  const [stockIn] = useState("0");
  const [used] = useState("0");
  const [wasted] = useState("0");
  const [stockMin, setStockMin] = useState("");
  const [unit, setUnit] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true); // State untuk sidebar

  // Fungsi untuk toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Periksa field yang bisa diisi oleh user saja
    if (!name || !start || !warehouseStart || !stockMin || !unit) {
      toast.error("Semua field harus diisi!");
      return;
    }

    const data = {
      name,
      start: parseFloat(start),
      warehouseStart: parseFloat(warehouseStart),
      stockIn: parseFloat(stockIn), // 0
      used: parseFloat(used),         // 0
      wasted: parseFloat(wasted),     // 0
      stockMin: parseFloat(stockMin),
      unit,
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
        // Reset form (field yang tidak dapat diubah tetap 0)
        setName("");
        setStart("");
        setWarehouseStart("");
        setStockMin("");
        setUnit("");
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
      <div className="max-w-md mx-auto p-6 bg-white rounded shadow-md mt-10" style={{ marginLeft: isSidebarOpen ? '256px' : '80px' }}>
        <Sidebar onToggle={toggleSidebar} isOpen={isSidebarOpen} />
        <h1 className="text-xl font-bold mb-4 text-center">Create Ingredient</h1>
        <form onSubmit={handleSubmit}>
          {/* Input Name */}
          <div className="mb-4">
            <label className="block font-medium mb-1">Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              required
            />
          </div>

          {/* Baris untuk Start dan Start Gudang */}
          <div className="mb-4 flex gap-4">
            <div className="w-1/2">
              <label className="block font-medium mb-1">Start:</label>
              <input
                type="number"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                required
                step="any"
              />
            </div>
            <div className="w-1/2">
              <label className="block font-medium mb-1">Start Gudang:</label>
              <input
                type="number"
                value={warehouseStart}
                onChange={(e) => setWarehouseStart(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                required
                step="any"
              />
            </div>
          </div>

          {/* Input Unit */}
          <div className="mb-4">
            <label className="block font-medium mb-1">Unit:</label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="e.g., gram, pack, butir"
              required
            />
          </div>

          {/* Input Stock Min */}
          <div className="mb-4">
            <label className="block font-medium mb-1">Stock Min:</label>
            <input
              type="number"
              value={stockMin}
              onChange={(e) => setStockMin(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              required
              step="any"
            />
          </div>

          {/* Input Stock In (readonly) */}
          <div className="mb-4">
            <label className="block font-medium mb-1">Stock In:</label>
            <input
              type="number"
              value={stockIn}
              readOnly
              className="w-full p-2 border border-gray-300 rounded bg-gray-100"
              required
              step="any"
            />
          </div>

          {/* Input Used (readonly) */}
          <div className="mb-4">
            <label className="block font-medium mb-1">Used:</label>
            <input
              type="number"
              value={used}
              readOnly
              className="w-full p-2 border border-gray-300 rounded bg-gray-100"
              required
              step="any"
            />
          </div>

          {/* Input Wasted (readonly) */}
          <div className="mb-4">
            <label className="block font-medium mb-1">Wasted:</label>
            <input
              type="number"
              value={wasted}
              readOnly
              className="w-full p-2 border border-gray-300 rounded bg-gray-100"
              required
              step="any"
            />
          </div>

          <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded">
            Create Ingredient
          </button>
        </form>
      </div>
      {/* Toaster hanya ditambahkan di dalam komponen ini */}
      <Toaster position="top-right" />
    </>
  );
}