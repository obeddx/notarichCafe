"use client";
import { useState, useEffect, FormEvent } from "react";
import Sidebar from "@/components/sidebar";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { FiSearch } from "react-icons/fi";

type Price = {
  unitPrice: string;
  price: number;
};

type Ingredient = {
  id: number;
  name: string;
  start: number;
  stockIn: number;
  used: number;
  wasted: number;
  stockMin: number;
  stock: number; // Stock akhir
  unit: string;
  prices: Price[]; // Data harga dari API
  // Properti tambahan untuk keperluan edit di modal:
  price?: number; // Mengambil nilai price dari prices[0].price
  unitPriceQuantity?: number; // Mengambil nilai unitPrice dari prices[0].unitPrice (dikonversi ke number)
};

// Tipe extended untuk menyimpan nilai originalStockIn dan originalWasted
type SelectedIngredient = Ingredient & { 
  originalStockIn: number;
  originalWasted: number;
};

export default function IngredientsTable() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [selectedIngredient, setSelectedIngredient] = useState<SelectedIngredient | null>(null);
  // State untuk menyimpan input tambahan stockIn dan wasted
  const [additionalStock, setAdditionalStock] = useState<string>("");
  const [additionalWasted, setAdditionalWasted] = useState<string>("");

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredIngredient, setFilteredIngredient] = useState<Ingredient[]>([]);

  const router = useRouter();
  
  // Fungsi untuk mengambil data ingredients dari API
  const fetchIngredients = async () => {
    try {
      const res = await fetch("/api/bahan");
      if (!res.ok) {
        throw new Error("Gagal mengambil data ingredients.");
      }
      const data = await res.json();
      setIngredients(data);
      setFilteredIngredient(data);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  useEffect(() => {
    const filtered = ingredients.filter((ingredient) =>
      ingredient.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredIngredient(filtered);
  }, [searchQuery, ingredients]);

  // Fungsi untuk menghapus ingredient
  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus ingredient ini?")) return;
    try {
      const res = await fetch(`/api/bahan/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Gagal menghapus ingredient.");
      }
      setIngredients(ingredients.filter((ing) => ing.id !== id));
      toast.success("Ingredient berhasil dihapus!");
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus ingredient.");
    }
  };

  // Fungsi untuk membuka modal edit ingredient dan menginisialisasi field tambahan
  const handleEdit = (id: number) => {
    const ing = ingredients.find((i) => i.id === id);
    if (ing) {
      setSelectedIngredient({
        ...ing,
        // Inisialisasi field price dan unitPriceQuantity dari prices (elemen pertama)
        price: ing.prices[0]?.price ?? 0,
        unitPriceQuantity: ing.prices[0]?.unitPrice ? parseFloat(ing.prices[0].unitPrice) : 0,
        originalStockIn: ing.stockIn, // Simpan nilai stockIn awal
        originalWasted: ing.wasted,   // Simpan nilai wasted awal
      });
      // Reset nilai input tambahan
      setAdditionalStock("");
      setAdditionalWasted("");
    }
  };

  // Fungsi untuk menutup modal
  const handleModalClose = () => {
    setSelectedIngredient(null);
  };

  // Fungsi untuk submit perubahan pada modal edit ingredient
  const handleEditSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedIngredient) return;
    try {
      const res = await fetch(`/api/bahan/${selectedIngredient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // Kirim seluruh data ingredient, termasuk field tambahan price dan unitPriceQuantity
        body: JSON.stringify(selectedIngredient),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Ingredient berhasil diedit!");
        setIngredients(
          ingredients.map((ing) =>
            ing.id === selectedIngredient.id ? data.ingredient : ing
          )
        );
        setSelectedIngredient(null);
      } else {
        alert(data.message || "Gagal mengupdate ingredient.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat mengupdate ingredient.");
    }
  };

  const handleResetDailyStock = async () => {
    const confirmed = confirm("Apakah Anda yakin ingin mereset stok harian?");
    if (!confirmed) return;
  
    try {
      const res = await fetch("/api/resetDailyStock", {
        method: "POST",
      });
      const result = await res.json();
      console.log("Reset result:", result);
      alert(result.message);
      if (res.ok) {
        router.push("/manager/rekapStokCafe");
      }
    } catch (error) {
      console.error("Error resetting daily stock:", error);
    }
  };

  // Filter ingredient dengan stock akhir <= stockMin
  const lowStockIngredients = ingredients.filter(
    (ingredient) => ingredient.stock <= ingredient.stockMin
  );

  // Fungsi untuk toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (loading) return <p>Loading ingredients...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="p-4 mt-[85px]" style={{ marginLeft: isSidebarOpen ? '256px' : '80px' }}>
      <h1 className="text-2xl font-bold mb-4">Daftar Ingredients</h1>
      <Sidebar onToggle={toggleSidebar} isOpen={isSidebarOpen} />
      <Link href="/manager/addBahan">
        <p className="text-blue-500 hover:underline pb-4">+ Tambah Ingredient Baru</p>
      </Link>
      <div className="p-4">
        {lowStockIngredients.length > 0 ? (
          lowStockIngredients.map((ingredient) => (
            <p key={ingredient.id} className="text-lg font-semibold text-red-600">
              Stock untuk {ingredient.name} {ingredient.stock} {ingredient.unit} (Minimum: {ingredient.stockMin} {ingredient.unit})
            </p>
          ))
        ) : (
          <p className="text-green-600">Semua stok dalam keadaan baik.</p>
        )}
      </div>
      <div className="flex justify-end mb-6">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            placeholder="Cari menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="button" className="absolute right-0 top-0 mt-3 mr-3 text-gray-500">
            <FiSearch size={20} />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock In</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Used</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wasted</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Min</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Akhir</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Satuan Harga</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredIngredient.map((ingredient) => (
              <tr key={ingredient.id} className="text-center">
                <td className="px-6 py-4 whitespace-nowrap">{ingredient.id}</td>
                <td className="px-6 py-4 whitespace-nowrap">{ingredient.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{ingredient.start}</td>
                <td className="px-6 py-4 whitespace-nowrap">{ingredient.stockIn}</td>
                <td className="px-6 py-4 whitespace-nowrap">{ingredient.used}</td>
                <td className="px-6 py-4 whitespace-nowrap">{ingredient.wasted}</td>
                <td className="px-6 py-4 whitespace-nowrap">{ingredient.stockMin}</td>
                <td className="px-6 py-4 whitespace-nowrap">{ingredient.stock}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {ingredient.prices.map((price, index) => (
                    <span key={index}>{price.price}</span>
                  ))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {ingredient.prices.map((price, index) => (
                    <span key={index}>{price.unitPrice}</span>
                  ))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{ingredient.unit}</td>
                <td className="px-8 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleEdit(ingredient.id)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(ingredient.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filteredIngredient.length === 0 && (
              <tr>
                <td className="py-2 px-4 border-b text-center" colSpan={10}>
                  Tidak ada data ingredients.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <button 
          onClick={handleResetDailyStock} 
          className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition duration-200"
        >
          Rekap Stock Cafe
        </button>

        <div className="flex items-start bg-yellow-100 border-l-4 border-yellow-500 p-3 rounded-md mt-4">
          <AlertTriangle className="text-yellow-700 w-5 h-5 mr-2 mt-1" />
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-yellow-900">Perhatian:</span> Tekan tombol <span className="font-semibold text-red-600">Reset Stock</span> hanya pada saat <span className="font-semibold">closing cafe</span>, untuk menyimpan rekap pengeluaran stok hari ini.
          </p>
        </div>
      </div>

      {/* Modal Edit Ingredient */}
      {selectedIngredient && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div
            className="bg-white rounded-lg p-6 w-full max-w-lg max-h-screen overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 40px)" }}
          >
            <h2 className="text-xl font-bold mb-4">Edit Ingredient</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="mb-4">
                <label className="block font-medium mb-1">Name:</label>
                <input
                  type="text"
                  value={selectedIngredient.name}
                  onChange={(e) =>
                    setSelectedIngredient({
                      ...selectedIngredient,
                      name: e.target.value,
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Start:</label>
                <input
                  type="number"
                  value={selectedIngredient.start}
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                />
              </div>
              {/* Field untuk input tambahan stockIn */}
              <div className="mb-4">
                <label className="block font-medium mb-1">
                  Stock In (Tambahan):
                </label>
                <input
                  type="number"
                  value={additionalStock}
                  onChange={(e) => {
                    const inputVal = e.target.value;
                    setAdditionalStock(inputVal);
                    if (selectedIngredient) {
                      setSelectedIngredient({
                        ...selectedIngredient,
                        stockIn:
                          selectedIngredient.originalStockIn +
                          (parseFloat(inputVal) || 0),
                      });
                    }
                  }}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                  step="any"
                  placeholder="Masukkan tambahan stock"
                />
                <p>Masukkan angka 0 jika tidak ingin stock in</p>
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Used:</label>
                <input
                  type="number"
                  value={selectedIngredient.used}
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                  step="any"
                />
              </div>
              {/* Field untuk input tambahan wasted */}
              <div className="mb-4">
                <label className="block font-medium mb-1">
                  Wasted (Tambahan):
                </label>
                <input
                  type="number"
                  value={additionalWasted}
                  onChange={(e) => {
                    const inputVal = e.target.value;
                    setAdditionalWasted(inputVal);
                    if (selectedIngredient) {
                      setSelectedIngredient({
                        ...selectedIngredient,
                        wasted:
                          selectedIngredient.originalWasted +
                          (parseFloat(inputVal) || 0),
                      });
                    }
                  }}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                  step="any"
                  placeholder="Masukkan tambahan wasted"
                />
                <p>Masukkan angka 0 jika tidak ingin wasted</p>
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Stock Min:</label>
                <input
                  type="number"
                  value={selectedIngredient.stockMin}
                  onChange={(e) =>
                    setSelectedIngredient({
                      ...selectedIngredient,
                      stockMin: parseFloat(e.target.value),
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                  step="any"
                />
                
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Unit:</label>
                <input
                  type="text"
                  value={selectedIngredient.unit}
                  onChange={(e) =>
                    setSelectedIngredient({
                      ...selectedIngredient,
                      unit: e.target.value,
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              {/* Field input untuk Price */}
              <div className="mb-4">
                <label className="block font-medium mb-1">Price:</label>
                <input
                  type="number"
                  value={selectedIngredient.price ?? ""}
                  onChange={(e) =>
                    setSelectedIngredient({
                      ...selectedIngredient,
                      price: parseFloat(e.target.value),
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                  step="any"
                />
              </div>
              {/* Field Satuan Harga (2 kolom) */}
              <div className="mb-4">
                <label className="block font-medium mb-1">Satuan Harga:</label>
                <div className="flex space-x-2">
                  {/* Kolom untuk input jumlah satuan */}
                  <input
                    type="number"
                    value={selectedIngredient.unitPriceQuantity ?? ""}
                    onChange={(e) =>
                      setSelectedIngredient({
                        ...selectedIngredient,
                        unitPriceQuantity: e.target.value ? parseFloat(e.target.value) : 0,
                      })
                    }
                    className="w-1/2 p-2 border border-gray-300 rounded"
                    required
                    step="any"
                    placeholder="Jumlah satuan"
                  />
                  {/* Kolom otomatis terisi (readonly) dari perubahan unit */}
                  <input
                    type="text"
                    value={selectedIngredient.unit}
                    readOnly
                    className="w-1/2 p-2 border border-gray-300 rounded bg-gray-100"
                    placeholder="Satuan"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toaster untuk notifikasi */}
      <Toaster position="top-right" />
    </div>
  );
}
