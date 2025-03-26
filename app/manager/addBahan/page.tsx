"use client";
import { useState, FormEvent, useEffect } from "react";
import toast from "react-hot-toast";
import Sidebar from "@/components/sidebar";
import { useRouter } from "next/navigation";

type Categories = {
  id: number;
  name: string;
  description: string;
};

export default function CreateIngredient() {
  // State untuk Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const [categories, setCategories] = useState<Categories[]>([]);

  // State untuk form ingredient
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [warehouseStart, setWarehouseStart] = useState("");
  // Field dengan nilai default yang tidak diubah
  const [stockIn] = useState("0");
  const [used] = useState("0");
  const [wasted] = useState("0");
  const [stockMin, setStockMin] = useState("");
  // Unit untuk ingredient (misalnya: gram, pack, dll)
  const [unit, setUnit] = useState("");
  // Field untuk finished unit (misalnya: gram, liter), default "-"
  const [finishedUnit, setFinishedUnit] = useState("-");
  // Field untuk harga (angka)
  const [price, setPrice] = useState("");
  // Field kategori, default "main"
  const [category, setCategory] = useState("");
  // Dropdown untuk tipe ingredient, default RAW
  const [type, setType] = useState("RAW");

  const router = useRouter();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) {
          throw new Error("Gagal mengambil data categori.");
        }
        const data = await res.json();
        setCategories(data.categories);
      } catch (err: any) {
        console.error("Error fetching raw ingredients:", err.message);
      }
    };

    fetchCategories();
  }, []);

  // Event handler untuk mencegah simbol "-" dan "+"
  const handleNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "-" || e.key === "+") {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validasi bahwa semua field yang diperlukan telah diisi
    if (!name || !start || !warehouseStart || !stockMin || !unit || !price) {
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
      unit,
      finishedUnit,
      categoryId: parseInt(category),
      type,
      price: parseFloat(price),
    };

    try {
      const res = await fetch("/api/addBahan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (res.ok) {
        toast.success(result.toast?.text || "Ingredient berhasil dibuat!");
        // Reset field yang dapat diubah
        setName("");
        setStart("");
        setWarehouseStart("");
        setStockMin("");
        setUnit("");
        setFinishedUnit("gram");
        setCategory("");
        setType("RAW");
        setPrice("");
        router.push("/manager/getBahan");
      } else {
        toast.error(result.message || "Gagal membuat ingredient.");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Terjadi kesalahan saat membuat ingredient.");
    }
  };

  return (
    <div className="min-h-screen">
      {/* Sidebar */}
      <Sidebar onToggle={toggleSidebar} isOpen={isSidebarOpen} />

      <div className="p-4 mt-20 transition-all" style={{ marginLeft: isSidebarOpen ? "256px" : "80px" }}>
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

            {/* Row untuk Start dan Warehouse Start */}
            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block font-semibold mb-1">Stock Cafe:</label>
                <input
                  type="number"
                  min="0"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  onKeyDown={handleNumberKeyDown}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                  required
                  step="any"
                  placeholder="0"
                />
              </div>
              <div className="w-1/2">
                <label className="block font-semibold mb-1">Stock Inventory:</label>
                <input
                  type="number"
                  min="0"
                  value={warehouseStart}
                  onChange={(e) => setWarehouseStart(e.target.value)}
                  onKeyDown={handleNumberKeyDown}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                  required
                  step="any"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Input Category */}
            <div className="mb-4">
              <label className="block font-medium mb-1">Kategori Ingredient:</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 border border-gray-300 rounded" required>
                <option value="">Pilih Kategori</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Row untuk Ingredient Unit dan Finished Unit */}
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
                <label className="block font-semibold mb-1">Finished Unit:</label>
                <input type="text" value={finishedUnit} onChange={(e) => setFinishedUnit(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed" placeholder="e.g., gram, liter" readOnly />
              </div>
            </div>

            {/* Input Price */}
            <div>
              <label className="block font-semibold mb-1">Price per 1 {unit}:</label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                onKeyDown={handleNumberKeyDown}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                required
                step="any"
                placeholder="Harga per finished unit"
              />
            </div>

            {/* Input Stock Min */}
            <div>
              <label className="block font-semibold mb-1">Stock Min / Alert at:</label>
              <input
                type="number"
                min="0"
                value={stockMin}
                onChange={(e) => setStockMin(e.target.value)}
                onKeyDown={handleNumberKeyDown}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                required
                step="any"
                placeholder="Minimal stok"
              />
            </div>

            {/* Readonly fields: Stock In, Used, Wasted */}
            <div>
              <label className="block font-semibold mb-1">Stock In:</label>
              <input type="number" value={stockIn} readOnly className="w-full p-3 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed" required step="any" />
            </div>

            <div>
              <label className="block font-semibold mb-1">Used:</label>
              <input type="number" value={used} readOnly className="w-full p-3 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed" required step="any" />
            </div>

            <div>
              <label className="block font-semibold mb-1">Wasted:</label>
              <input type="number" value={wasted} readOnly className="w-full p-3 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed" required step="any" />
            </div>

            {/* Dropdown untuk Ingredient Type */}
            <div>
              <label className="block font-semibold mb-1">Ingredient Type:</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition" required>
                <option value="RAW">RAW</option>
              </select>
            </div>

            <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-md transition-colors">
              Create Ingredient
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
