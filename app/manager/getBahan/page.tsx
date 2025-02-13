// /pages/admin/ingredients.tsx
"use client";
import { useState, useEffect, FormEvent } from "react";
import Sidebar from "@/components/sidebar";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";

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
};

export default function IngredientsTable() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);

  // Fungsi untuk mengambil data ingredients dari API
  const fetchIngredients = async () => {
    try {
      const res = await fetch("/api/bahan");
      if (!res.ok) {
        throw new Error("Gagal mengambil data ingredients.");
      }
      const data = await res.json();
      setIngredients(data);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  // Fungsi untuk menghapus ingredient
  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus ingredient ini?")) return;
    try {
      const res = await fetch(`/api/bahan/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Gagal menghapus ingredient.");
      }
      // Mengupdate state ingredients setelah penghapusan
      setIngredients(ingredients.filter((ing) => ing.id !== id));
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus ingredient.");
    }
  };

  // Fungsi untuk membuka modal edit ingredient
  const handleEdit = (id: number) => {
    const ing = ingredients.find((i) => i.id === id);
    if (ing) {
      setSelectedIngredient(ing);
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
        body: JSON.stringify(selectedIngredient),
      });
      const data = await res.json();
      if (res.ok) {
        // Tampilkan toast sukses ketika edit berhasil
        toast.success("Ingredient berhasil diedit!");
        // Perbarui state ingredients dengan data yang dikembalikan dari API
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

  if (loading) return <p>Loading ingredients...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="p-4 mt-[85px] lg:ml-64">
  <h1 className="text-2xl font-bold mb-4">Daftar Ingredients</h1>
  <Sidebar />
  <Link href="/manager/addBahan">
    <p className="text-blue-500 hover:underline pb-4">+ Tambah Ingredient Baru</p>
  </Link>

  {/* Tambahkan overflow-x-auto agar tabel bisa di-scroll pada layar kecil */}
  <div className="overflow-x-auto">
    <table className="min-w-full bg-white border border-gray-200">
      <thead>
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock In</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Used</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wasted</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Min</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Akhir</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {ingredients.map((ingredient) => (
          <tr key={ingredient.id} className="text-center">
            <td className="px-4 py-3">{ingredient.id}</td>
            <td className="px-4 py-3">{ingredient.name}</td>
            <td className="px-4 py-3">{ingredient.start}</td>
            <td className="px-4 py-3">{ingredient.stockIn}</td>
            <td className="px-4 py-3">{ingredient.used}</td>
            <td className="px-4 py-3">{ingredient.wasted}</td>
            <td className="px-4 py-3">{ingredient.stockMin}</td>
            <td className="px-4 py-3">{ingredient.stock}</td>
            <td className="px-4 py-3">{ingredient.unit}</td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => handleEdit(ingredient.id)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(ingredient.id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        ))}
        {ingredients.length === 0 && (
          <tr>
            <td className="py-2 px-4 border-b text-center" colSpan={10}>
              Tidak ada data ingredients.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>

  {/* Modal Edit Ingredient yang lebih responsif */}
  {selectedIngredient && (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg sm:max-w-md" style={{ maxHeight: "calc(100vh - 40px)" }}>
        <h2 className="text-xl font-bold mb-4">Edit Ingredient</h2>
        <form onSubmit={handleEditSubmit}>
          <div className="mb-4">
            <label className="block font-medium mb-1">Name:</label>
            <input
              type="text"
              value={selectedIngredient.name}
              onChange={(e) =>
                setSelectedIngredient({ ...selectedIngredient, name: e.target.value })
              }
              className="w-full p-2 border border-gray-300 rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block font-medium mb-1">Stock In:</label>
            <input
              type="number"
              value={selectedIngredient.stockIn}
              onChange={(e) =>
                setSelectedIngredient({ ...selectedIngredient, stockIn: parseFloat(e.target.value) })
              }
              className="w-full p-2 border border-gray-300 rounded"
              required
              step="any"
            />
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

  <Toaster position="top-right" />
</div>

  );
}
