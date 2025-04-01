"use client";

import { useState, useEffect } from "react";
import Select from "react-select";
import toast from "react-hot-toast";

type Ingredient = {
  id: number;
  name: string;
  start: number;
  stockIn: number;
  used: number;
  wasted: number;
  stockMin: number;
  stock: number;
  unit: string;
  finishedUnit: string;
  categoryId: number;
  batchYield: number;
  type: "RAW" | "SEMI_FINISHED";
  price: number;
};

type SelectedIngredient = Ingredient & {
  originalStockIn: number;
  originalWasted: number;
};

type Category = {
  id: number;
  name: string;
  description: string;
};

type SemiComposition = {
  rawIngredientId: number | "";
  amount: number | "";
};

interface EditIngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EditIngredientModal({ isOpen, onClose }: EditIngredientModalProps) {
  const [activeTab, setActiveTab] = useState<"RAW" | "SEMI_FINISHED">("RAW");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State untuk ingredient yang dipilih
  const [rawIngredient, setRawIngredient] = useState<SelectedIngredient | null>(null);
  const [semiIngredient, setSemiIngredient] = useState<SelectedIngredient | null>(null);
  const [compositions, setCompositions] = useState<SemiComposition[]>([]);

  // Fetch data dari API
  const fetchIngredients = async () => {
    try {
      const res = await fetch("/api/bahan");
      if (!res.ok) throw new Error("Gagal mengambil data ingredients.");
      const data = await res.json();
      setIngredients(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan.");
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Gagal mengambil data categories.");
      const data = await res.json();
      setCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat mengambil kategori.");
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([fetchIngredients(), fetchCategories()]).finally(() => setLoading(false));
    }
  }, [isOpen]);

  // Filter ingredients berdasarkan tipe
  const rawIngredients = ingredients.filter((ing) => ing.type === "RAW");
  const semiIngredients = ingredients.filter((ing) => ing.type === "SEMI_FINISHED");

  // Fungsi untuk mengisi data berdasarkan ID yang dipilih
  const handleIngredientSelect = (selectedOption: any, ingredientType: "RAW" | "SEMI_FINISHED") => {
    const ingredientsList = ingredientType === "RAW" ? rawIngredients : semiIngredients;
    const selectedIngredient = ingredientsList.find((ing) => ing.id === selectedOption?.value);

    if (selectedIngredient) {
      const updatedIngredient = {
        ...selectedIngredient,
        originalStockIn: selectedIngredient.stockIn,
        originalWasted: selectedIngredient.wasted,
      };

      if (ingredientType === "RAW") {
        setRawIngredient(updatedIngredient);
      } else {
        setSemiIngredient(updatedIngredient);
        fetchComposition(selectedIngredient.id);
      }
    } else {
      console.error("Ingredient tidak ditemukan:", selectedOption?.value);
    }
  };

  const fetchComposition = async (semiIngredientId: number) => {
    try {
      const res = await fetch(`/api/ingredientComposition?semiIngredientId=${semiIngredientId}`);
      if (res.ok) {
        const compositionData = await res.json();
        setCompositions(Array.isArray(compositionData) ? compositionData : []);
      } else {
        console.error("Gagal mengambil data composition");
        setCompositions([]);
      }
    } catch (error) {
      console.error("Error fetching composition:", error);
      setCompositions([]);
    }
  };

  const handleSave = async () => {
    const selectedIngredient = activeTab === "RAW" ? rawIngredient : semiIngredient;
    if (!selectedIngredient) {
      toast.error("Pilih ingredient terlebih dahulu!");
      return;
    }

    try {
      if (activeTab === "RAW") {
        // Untuk RAW: Tambahkan stockIn dan wasted baru ke nilai lama
        const updatedStockIn = selectedIngredient.originalStockIn + (selectedIngredient.stockIn || 0);

        const updatedWasted = selectedIngredient.originalWasted + (selectedIngredient.wasted || 0);

        const res = await fetch(`/api/bahan/${selectedIngredient.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stockIn: updatedStockIn,
            wasted: updatedWasted,
            stockMin: selectedIngredient.stockMin,
          }),
        });

        if (res.ok) {
          toast.success(`Berhasil Edit Stock untuk ingredient ${selectedIngredient.name}`);
          fetchIngredients(); // Refresh data
          setRawIngredient(null); // Reset pilihan setelah save
          onClose();
        } else {
          const data = await res.json();
          toast.error(data.message || "Gagal mengupdate raw ingredient.");
        }
      } else {
        // Untuk SEMI_FINISHED: Kirim producedQuantity, stockMin, dan composition
        const updatedStockInSemi = selectedIngredient.originalStockIn + (selectedIngredient.batchYield || 0);
        const res = await fetch(`/api/semiIngredientDashboard/${selectedIngredient.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            producedQuantity: selectedIngredient.batchYield, // Gunakan stockIn sebagai producedQuantity
            stockMin: selectedIngredient.stockMin,
            stockIn: updatedStockInSemi,
            composition: compositions.map((comp) => ({
              rawIngredientId: Number(comp.rawIngredientId),
              amount: Number(comp.amount),
            })),
          }),
        });

        if (res.ok) {
          toast.success("Semi-finished ingredient berhasil diedit!");
          fetchIngredients(); // Refresh data
          setSemiIngredient(null); // Reset pilihan setelah save
          setCompositions([]); // Reset komposisi
          onClose();
        } else {
          const data = await res.json();
          toast.error(data.message || "Gagal mengupdate semi-finished ingredient.");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan saat mengupdate ingredient.");
    }
  };

  const handleAddComposition = () => {
    setCompositions([...compositions, { rawIngredientId: "", amount: "" }]);
  };

  // Fungsi untuk mendapatkan nama kategori berdasarkan categoryId
  const getCategoryName = (categoryId: number) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? category.name : "Category Not Found";
  };

  if (!isOpen) return null;

  // Opsi untuk react-select
  const ingredientOptions = (activeTab === "RAW" ? rawIngredients : semiIngredients).map((ing) => ({
    value: ing.id,
    label: ing.name,
  }));

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Edit Ingredient</h2>

        {/* Sub Navigation */}
        <div className="flex border-b mb-4">
          <button className={`px-4 py-2 ${activeTab === "RAW" ? "border-b-2 border-blue-500" : ""}`} onClick={() => setActiveTab("RAW")}>
            Raw Ingredient
          </button>
          <button className={`px-4 py-2 ${activeTab === "SEMI_FINISHED" ? "border-b-2 border-blue-500" : ""}`} onClick={() => setActiveTab("SEMI_FINISHED")}>
            Semi Ingredient
          </button>
        </div>

        {/* Dropdown untuk memilih ingredient */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Select Ingredient</label>
          <Select
            options={ingredientOptions}
            onChange={(option) => handleIngredientSelect(option, activeTab)}
            placeholder="Search and select ingredient..."
            isSearchable
            className="w-full"
            value={ingredientOptions.find((opt) => opt.value === (activeTab === "RAW" ? rawIngredient?.id : semiIngredient?.id))}
          />
        </div>

        {/* Form berdasarkan tab aktif */}
        {activeTab === "RAW" && rawIngredient ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Stock In (Tambah)</label>
              <input
                type="number"
                min="0"
                value={rawIngredient.stockIn}
                onChange={(e) => setRawIngredient({ ...rawIngredient, stockIn: Number(e.target.value) })}
                className="w-full p-2 border rounded"
                placeholder="Masukkan jumlah tambahan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Wasted (Tambah)</label>
              <input type="number" min="0" value={rawIngredient.wasted} onChange={(e) => setRawIngredient({ ...rawIngredient, wasted: Number(e.target.value) })} className="w-full p-2 border rounded" placeholder="Masukkan jumlah tambahan" />
            </div>
            <div>
              <label className="block text-sm font-medium">Stock Akhir</label>
              <input type="number" min="0" value={rawIngredient.stock} onChange={(e) => setRawIngredient({ ...rawIngredient, stock: Number(e.target.value) })} className="w-full p-2 border rounded bg-gray-100" disabled />
            </div>
            <div>
              <label className="block text-sm font-medium">Stock Minimum</label>
              <input type="number" min="0" value={rawIngredient.stockMin} onChange={(e) => setRawIngredient({ ...rawIngredient, stockMin: Number(e.target.value) })} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium">Unit</label>
              <input type="text" value={rawIngredient.unit} disabled className="w-full p-2 border rounded bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium">Price per 1 {rawIngredient.unit}</label>
              <input type="number" min="0" value={rawIngredient.price} disabled className="w-full p-2 border rounded bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium">Category</label>
              <input type="text" value={getCategoryName(rawIngredient.categoryId)} disabled className="w-full p-2 border border-gray-300 rounded bg-gray-100" />
            </div>
          </div>
        ) : activeTab === "SEMI_FINISHED" && semiIngredient ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Produced Quantity</label>
              <input
                type="number"
                min="0"
                value={semiIngredient.batchYield}
                onChange={(e) => setSemiIngredient({ ...semiIngredient, batchYield: Number(e.target.value) })}
                className="w-full p-2 border rounded bg-gray-100"
                disabled
                placeholder="Masukkan jumlah yang diproduksi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Stock Akhir</label>
              <input type="number" min="0" value={semiIngredient.stock} onChange={(e) => setRawIngredient({ ...semiIngredient, stock: Number(e.target.value) })} className="w-full p-2 border rounded bg-gray-100" disabled />
            </div>
            <div>
              <label className="block text-sm font-medium">Stock Minimum</label>
              <input type="number" min="0" value={semiIngredient.stockMin} onChange={(e) => setSemiIngredient({ ...semiIngredient, stockMin: Number(e.target.value) })} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium">Unit</label>
              <input type="text" value={semiIngredient.unit} disabled className="w-full p-2 border rounded bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium">Finished Unit</label>
              <input type="text" value={semiIngredient.finishedUnit} disabled className="w-full p-2 border rounded bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium">Price</label>
              <input type="text" value={`Rp. ${semiIngredient.price}`} disabled className="w-full p-2 border rounded bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium">Category</label>
              <input type="text" value={getCategoryName(semiIngredient.categoryId)} disabled className="w-full p-2 border border-gray-300 rounded bg-gray-100" />
            </div>
            <div>
              <h3 className="font-medium mb-2">
                Composition untuk pembuatan {semiIngredient.batchYield} {semiIngredient.finishedUnit} {semiIngredient.name}:{" "}
              </h3>
              {compositions.map((comp, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <select value={comp.rawIngredientId} disabled className="w-1/2 p-2 border rounded bg-gray-100">
                    <option value="">Select Raw Ingredient</option>
                    {rawIngredients.map((raw) => (
                      <option key={raw.id} value={raw.id}>
                        {raw.name}
                      </option>
                    ))}
                  </select>
                  <input type="number" placeholder="Amount" value={comp.amount} disabled className="w-1/2 p-2 border rounded bg-gray-100" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>Pilih ingredient terlebih dahulu</div>
        )}

        {/* Tombol Aksi */}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
