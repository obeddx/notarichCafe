import { useState, useEffect, FormEvent } from "react";

interface IngredientOption {
  id: number;
  name: string;
  unit?: string;
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

export default function EditMenuModal({ menuId, onClose, onMenuUpdated }: EditMenuModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null); // State untuk menyimpan URL gambar
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

        // Set image URL jika ada
        if (data.image) {
          setImageUrl(data.image); // Set URL gambar yang ada
        }

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
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg inline-block mx-auto max-w-full max-h-[90vh] overflow-y-auto">
        <h1 className="text-center text-2xl font-bold mb-6">Edit Menu</h1>
        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block font-semibold mb-2">Nama Menu:</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full p-2 border border-gray-300 rounded mt-1" />
            </div>
            <div>
              <label className="block font-semibold mb-2">Status:</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} required className="w-full p-2 border border-gray-300 rounded mt-1">
                <option value="tersedia">Tersedia</option>
                <option value="habis">Habis</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block font-semibold mb-2">Price:</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required className="w-full p-2 border border-gray-300 rounded mt-1" />
            </div>
            <div>
              <label className="block font-semibold mb-2">Category:</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} required className="w-full p-2 border border-gray-300 rounded mt-1">
              <option value="Coffee">Coffee</option>
                  <option value="Tea">Tea</option>
                  <option value="Frappe">Frappe</option>
                  <option value="Juice">Juice</option>
                  <option value="Milk Base">Milk Base</option>
                  <option value="Refresher">Refresher</option>
                  <option value="Cocorich">Cocorich</option>
                  <option value="Mocktail">Mocktail</option>
                  <option value="Snack">Snack</option>
                  <option value="Main Course">Main Course</option>
              </select>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Ingredients</h2>
              {ingredientRows.map((row, index) => {
  const selectedIngredient = availableIngredients.find(ing => ing.id === row.ingredientId);
  return (
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
      <div className="flex items-center">
        <input
          type="number"
          placeholder="Amount"
          value={row.amount}
          onChange={(e) =>
            updateIngredientRow(index, "amount", parseFloat(e.target.value))
          }
          required
          className="p-2 border border-gray-300 rounded"
        />
        {/* Tampilkan satuan jika tersedia */}
        {selectedIngredient?.unit && (
          <span className="ml-2">{selectedIngredient.unit}</span>
        )}
      </div>
      <button
        type="button"
        onClick={() => removeIngredientRow(index)}
        className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
      >
        Remove
      </button>
    </div>
  );
})}

              <button type="button" onClick={addIngredientRow} className="mt-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
                Add Ingredient
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 mb-4">
            <div>
              <label className="block font-semibold mb-2">Deskripsi:</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 border border-gray-300 rounded mt-1 min-h-[80px] resize-y" />
            </div>
            <div>
              <label className="block font-semibold mb-2">Gambar:</label>
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
              {imageUrl && !image && <img src={imageUrl} alt="current menu" className="mt-2 max-h-40 object-cover" />}
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">
              Cancel
            </button>
            <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
              Update Menu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
