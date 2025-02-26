"use client";
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

interface ModifierOption {
  id: number;
  name: string;
}

interface Discount {
  id: number;
  name: string;
  type: string;
  scope: string;
  value: number;
  isActive: boolean;
}

interface DiscountInfo {
  discount: Discount;
}

interface Modifier {
  modifier: {
    id: number;
    name: string;
  };
}

interface EditMenuModalProps {
  menuId: number;
  onCloseAction: () => void; // Ubah nama prop
  onMenuUpdatedAction: () => void; // Ubah nama prop
}

export default function EditMenuModal({ menuId, onCloseAction, onMenuUpdatedAction }: EditMenuModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("tersedia");
  const [category, setCategory] = useState("makanan");
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>([]);
  const [availableIngredients, setAvailableIngredients] = useState<IngredientOption[]>([]);
  const [applyDiscount, setApplyDiscount] = useState<boolean>(false);
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>("");
  const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([]);
  const [availableModifiers, setAvailableModifiers] = useState<ModifierOption[]>([]);
  const [selectedModifierIds, setSelectedModifierIds] = useState<number[]>([]);

  // Ambil daftar ingredient yang tersedia
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

  // Ambil daftar diskon dengan scope MENU
  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        const res = await fetch("/api/diskon");
        const data = await res.json();
        const menuDiscounts = data.filter((d: any) => d.scope === "MENU" && d.isActive);
        setAvailableDiscounts(menuDiscounts);
      } catch (error) {
        console.error("Error fetching discounts:", error);
      }
    };
    fetchDiscounts();
  }, []);

  // Ambil daftar modifier yang tersedia
  useEffect(() => {
    const fetchModifiers = async () => {
      try {
        const res = await fetch("/api/modifier");
        const data = await res.json();
        setAvailableModifiers(data);
      } catch (error) {
        console.error("Error fetching modifiers:", error);
      }
    };
    fetchModifiers();
  }, []);

  // Ambil data menu berdasarkan menuId dan prefill form
  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        const res = await fetch(`/api/getMenuOne?id=${menuId}`);
        const data = await res.json();
        if (res.ok && data.menu) {
          setName(data.menu.name);
          setDescription(data.menu.description || "");
          setPrice(data.menu.price.toString());
          setStatus(data.menu.Status || "tersedia");
          setCategory(data.menu.category);
          if (data.menu.image) {
            setImageUrl(data.menu.image);
          }
          if (data.menu.ingredients && Array.isArray(data.menu.ingredients)) {
            const rows = data.menu.ingredients.map((item: any) => ({
              ingredientId: item.ingredientId || item.ingredient.id,
              amount: item.amount,
            }));
            setIngredientRows(rows);
          }
          if (data.menu.modifiers && Array.isArray(data.menu.modifiers)) {
            const modifierIds = data.menu.modifiers.map((mod: any) => mod.modifier.id);
            setSelectedModifierIds(modifierIds);
          }
          if (data.menu.discounts && data.menu.discounts.length > 0) {
            setApplyDiscount(true);
            setSelectedDiscountId(data.menu.discounts[0].discountId.toString());
          } else {
            setApplyDiscount(false);
            setSelectedDiscountId("");
          }
        }
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

  // Fungsi untuk mengelola modifier
  const addModifier = (modifierId: number) => {
    if (!selectedModifierIds.includes(modifierId) && modifierId !== 0) {
      setSelectedModifierIds([...selectedModifierIds, modifierId]);
    }
  };

  const removeModifier = (modifierId: number) => {
    setSelectedModifierIds(selectedModifierIds.filter((id) => id !== modifierId));
  };

  // Handler untuk submit form edit
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name || !price) {
      alert("Name dan Price wajib diisi!");
      return;
    }

    const formData = new FormData();
    formData.append("id", menuId.toString());
    formData.append("name", name);
    formData.append("description", description);
    formData.append("price", price);
    if (image) {
      formData.append("image", image);
    }
    formData.append("Status", status);
    formData.append("category", category);
    formData.append("ingredients", JSON.stringify(ingredientRows));
    formData.append("modifierIds", JSON.stringify(selectedModifierIds));
    if (applyDiscount && selectedDiscountId) {
      formData.append("discountId", selectedDiscountId);
    } else {
      formData.append("discountId", "");
    }

    try {
      const res = await fetch("/api/addMenu", {
        method: "PUT",
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        alert("Menu berhasil diupdate!");
        onMenuUpdatedAction();
        onCloseAction();
      } else {
        alert("Gagal mengupdate menu: " + (data.message || "Unknown error"));
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
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full p-2 border border-gray-300 rounded mt-1"
              />
            </div>
            <div>
              <label className="block font-semibold mb-2">Status:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                required
                className="w-full p-2 border border-gray-300 rounded mt-1"
              >
                <option value="tersedia">Tersedia</option>
                <option value="habis">Habis</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block font-semibold mb-2">Price:</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="w-full p-2 border border-gray-300 rounded mt-1"
              />
            </div>
            <div>
              <label className="block font-semibold mb-2">Category:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full p-2 border border-gray-300 rounded mt-1"
              >
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
                const selectedIngredient = availableIngredients.find(
                  (ing) => ing.id === row.ingredientId
                );
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
              <button
                type="button"
                onClick={addIngredientRow}
                className="mt-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              >
                Add Ingredient
              </button>
            </div>
          </div>

          {/* Section Modifier */}
          <div className="mb-4 border-t pt-4">
            <h2 className="text-xl font-semibold mb-2">Modifiers</h2>
            <label className="block font-semibold mb-2">
              Pilih Modifier:
              <select
                onChange={(e) => addModifier(parseInt(e.target.value))}
                value={0}
                className="w-full p-2 border border-gray-300 rounded mt-1"
              >
                <option value={0}>Pilih Modifier</option>
                {availableModifiers
                  .filter((mod) => !selectedModifierIds.includes(mod.id))
                  .map((mod) => (
                    <option key={mod.id} value={mod.id}>
                      {mod.name}
                    </option>
                  ))}
              </select>
            </label>
            {selectedModifierIds.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold">Modifier yang Dipilih:</h3>
                <ul className="list-disc pl-5">
                  {selectedModifierIds.map((modId) => {
                    const modifier = availableModifiers.find((m) => m.id === modId);
                    return (
                      <li key={modId} className="flex items-center justify-between py-1">
                        <span>{modifier?.name}</span>
                        <button
                          type="button"
                          onClick={() => removeModifier(modId)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Section Diskon */}
          <div className="mb-4 border-t pt-4">
            <h2 className="text-xl font-semibold mb-2">Diskon</h2>
            <label className="flex items-center mb-2">
              <input
                type="checkbox"
                checked={applyDiscount}
                onChange={(e) => setApplyDiscount(e.target.checked)}
                className="mr-2"
              />
              Terapkan Diskon untuk Menu ini
            </label>
            {applyDiscount && (
              <div>
                <label className="block font-semibold mb-2">
                  Pilih Diskon:
                  <select
                    value={selectedDiscountId}
                    onChange={(e) => setSelectedDiscountId(e.target.value)}
                    required={applyDiscount}
                    className="w-full p-2 border border-gray-300 rounded mt-1"
                  >
                    <option value="">Pilih Diskon</option>
                    {availableDiscounts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.value}
                        {d.type === "PERCENTAGE" ? "%" : ""})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 mb-4">
            <div>
              <label className="block font-semibold mb-2">Deskripsi:</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded mt-1 min-h-[80px] resize-y"
              />
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
              {imageUrl && !image && (
                <img src={imageUrl} alt="current menu" className="mt-2 max-h-40 object-cover" />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onCloseAction}
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