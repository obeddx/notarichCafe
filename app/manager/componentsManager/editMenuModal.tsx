// components/EditMenuModal.tsx
"use client";
import { useState, useEffect, FormEvent } from "react";

interface IngredientOption {
  id: number;
  name: string;
}

interface IngredientRow {
  ingredientId: number;
  amount: number;
}

interface EditMenuModalProps {
  menuId: number;
  onClose: () => void;
  onMenuUpdated: () => void;
}

export default function EditMenuModal({
  menuId,
  onClose,
  onMenuUpdated,
}: EditMenuModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [status, setStatus] = useState("tersedia");
  const [category, setCategory] = useState("makanan");
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>([]);
  const [availableIngredients, setAvailableIngredients] = useState<IngredientOption[]>([]);

  // Ambil daftar ingredient yang tersedia dari API
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const res = await fetch("/api/bahan");
        const data = await res.json();
        setAvailableIngredients(data);
      } catch (error) {
        console.error("Error fetching ingredients:", error);
      }
    };
    fetchIngredients();
  }, []);

  // Ambil data menu berdasarkan menuId dan prefill form
  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        const res = await fetch(`/api/getMenu/${menuId}`);
        const data = await res.json();
        setName(data.name);
        setDescription(data.description || "");
        setPrice(data.price.toString());
        setStatus(data.status);
        setCategory(data.category);
        // Asumsikan data.ingredients adalah array dengan format:
        // [{ id, amount, ingredient: { id, name, unit } }, ... ]
        const rows = data.ingredients.map((item: any) => ({
          ingredientId: item.ingredient.id,
          amount: item.amount,
        }));
        setIngredientRows(rows);
      } catch (error) {
        console.error("Error fetching menu data:", error);
      }
    };
    fetchMenuData();
  }, [menuId]);

  // Fungsi untuk mengelola baris ingredient
  const addIngredientRow = () => {
    setIngredientRows([...ingredientRows, { ingredientId: 0, amount: 0 }]);
  };

  const updateIngredientRow = (index: number, field: keyof IngredientRow, value: number) => {
    const newRows = [...ingredientRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setIngredientRows(newRows);
  };

  const removeIngredientRow = (index: number) => {
    const newRows = ingredientRows.filter((_, i) => i !== index);
    setIngredientRows(newRows);
  };

  // Handler untuk submit form edit
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name || !price) {
      alert("Name dan Price wajib diisi!");
      return;
    }

    // Buat FormData untuk mengirim data (termasuk file jika ada) dan ingredient (dalam bentuk JSON string)
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("price", price);
    if (image) {
      formData.append("image", image);
    }
    formData.append("status", status);
    formData.append("category", category);
    formData.append("ingredients", JSON.stringify(ingredientRows));

    try {
      // Misalnya, endpoint edit menggunakan metode PUT dengan URL: /api/editMenu/:id
      const res = await fetch(`/api/editMenu/${menuId}`, {
        method: "PUT",
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        alert("Menu berhasil diupdate!");
        onMenuUpdated(); // Memperbarui daftar menu di halaman utama
        onClose(); // Menutup modal
      } else {
        alert("Gagal mengupdate menu: " + data.message);
      }
    } catch (error) {
      console.error("Error updating menu:", error);
      alert("Terjadi kesalahan saat mengupdate menu.");
    }
  };

  return (
    // Modal background
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      {/* Modal container dengan lebar menyesuaikan konten dan scroll pada layar mobile */}
      <div className="bg-white p-6 rounded-lg shadow-lg inline-block mx-auto max-w-full max-h-[90vh] overflow-y-auto">
        <h1 className="text-center text-2xl font-bold mb-6">Edit Menu</h1>
        <form onSubmit={handleSubmit} encType="multipart/form-data">
          {/* Baris atas: Nama Menu dan Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block font-semibold mb-2">
                Nama Menu:
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded mt-1"
                />
              </label>
            </div>
            <div>
              <label className="block font-semibold mb-2">
                Status:
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded mt-1"
                >
                  <option value="tersedia">Tersedia</option>
                  <option value="habis">Habis</option>
                </select>
              </label>
            </div>
          </div>

          {/* Baris kedua: Grid 3 kolom (Price, Category, Ingredients) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block font-semibold mb-2">
                Price:
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded mt-1"
                />
              </label>
            </div>
            <div>
              <label className="block font-semibold mb-2">
                Category:
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded mt-1"
                >
                  <option value="makanan">Coffee</option>
                  <option value="minuman">Tea</option>
                  <option value="dessert">Frappe</option>
                  <option value="dessert">Juice</option>
                  <option value="dessert">Milk Base</option>
                  <option value="dessert">Refresher</option>
                  <option value="dessert">Cocorich</option>
                  <option value="dessert">Mocktail</option>
                  <option value="dessert">Sncak</option>
                  <option value="dessert">Main Course</option>
                </select>
              </label>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Ingredients</h2>
              {ingredientRows.map((row, index) => (
                <div key={index} className="flex gap-2 items-center mb-2">
                  <select
                    value={row.ingredientId}
                    onChange={(e) =>
                      updateIngredientRow(index, "ingredientId", parseInt(e.target.value))
                    }
                    required
                    className="flex-1 p-2 border border-gray-300 rounded"
                  >
                    <option value={0}>Pilih Ingredient</option>
                    {availableIngredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Amount"
                    value={row.amount}
                    onChange={(e) =>
                      updateIngredientRow(index, "amount", parseFloat(e.target.value))
                    }
                    required
                    className="flex-1 p-2 border border-gray-300 rounded"
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredientRow(index)}
                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addIngredientRow}
                className="mt-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              >
                Add Ingredient
              </button>
            </div>
          </div>

          {/* Baris ketiga: Deskripsi dan Gambar */}
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div>
              <label className="block font-semibold mb-2">
                Deskripsi:
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded mt-1 min-h-[80px] resize-y"
                />
              </label>
            </div>
            <div>
              <label className="block font-semibold mb-2">
                Gambar:
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files) {
                      setImage(e.target.files[0]);
                    }
                  }}
                  className="w-full mt-1"
                />
              </label>
            </div>
          </div>

          {/* Tombol aksi */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Update Menu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
