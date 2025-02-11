// /pages/admin/add-menu.tsx
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

export default function AddMenu() {
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

  // Tambah baris ingredient baru
  const addIngredientRow = () => {
    setIngredientRows([...ingredientRows, { ingredientId: 0, amount: 0 }]);
  };

  // Update nilai pada baris ingredient
  const updateIngredientRow = (index: number, field: keyof IngredientRow, value: number) => {
    const newRows = [...ingredientRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setIngredientRows(newRows);
  };

  // Hapus baris ingredient
  const removeIngredientRow = (index: number) => {
    const newRows = ingredientRows.filter((_, i) => i !== index);
    setIngredientRows(newRows);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name || !price || !image) {
      alert("Name, Price, dan Image wajib diisi!");
      return;
    }

    // Buat FormData untuk mengirim data termasuk file dan ingredient (dalam bentuk JSON string)
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("price", price);
    formData.append("image", image);
    formData.append("status", status);
    formData.append("category", category);
    formData.append("ingredients", JSON.stringify(ingredientRows));

    try {
      const res = await fetch("/api/addMenu", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        alert("Menu berhasil ditambahkan!");
        // Reset form
        setName("");
        setDescription("");
        setPrice("");
        setImage(null);
        setStatus("tersedia");
        setCategory("makanan");
        setIngredientRows([]);
      } else {
        alert("Gagal menambahkan menu: " + data.message);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Terjadi kesalahan.");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-200 p-4 mt-20">
      {/* Gunakan max-w-4xl agar form lebih lebar */}
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-4xl">
        <h1 className="text-center text-2xl font-bold mb-6">Tambah Menu</h1>
        <form onSubmit={handleSubmit} encType="multipart/form-data">
          {/* Gunakan grid dua kolom untuk mengelompokkan input secara horizontal */}
          <div className="grid grid-cols-2 gap-4">
            {/* Row 1: Nama Menu dan Price */}
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

            {/* Row 2: Status dan Category */}
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

            {/* Row 3: Deskripsi (spanning dua kolom) */}
            <div className="col-span-2">
              <label className="block font-semibold mb-2">
                Deskripsi:
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded mt-1 min-h-[80px] resize-y"
                />
              </label>
            </div>

            {/* Row 4: Gambar (spanning dua kolom) */}
            <div className="col-span-2">
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
                  required
                  className="w-full mt-1"
                />
              </label>
            </div>
          </div>

          {/* Ingredients Section */}
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Ingredients</h2>
            {ingredientRows.map((row, index) => (
              <div key={index} className="flex gap-4 items-center mb-4">
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
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addIngredientRow}
              className="mt-4 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              Add Ingredient
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Tambah Menu
          </button>
        </form>
      </div>
    </div>
  );
}
