"use client";
import { useState, useEffect, FormEvent } from "react";
import Sidebar from "@/components/sidebar";
import { useRouter, useSearchParams } from "next/navigation";

interface IngredientOption {
  id: number;
  name: string;
  unit: string;
}

interface IngredientRow {
  ingredientId: number;
  amount: number;
}

interface ModifierOption {
  id: number;
  name: string;
  price: number; // Tambahkan harga modifier
  category: { id: number; name: string }; // Tambahkan kategori modifier
}

interface Discount {
  id: number;
  name: string;
  scope: string;
  value: number;
  type: string;
}

interface ModifierCategory {
  id: number;
  name: string;
}

interface Menu {
  id: number;
  name: string;
  description: string | null;
  price: number;
  image: string;
  Status: string;
  category: string;
  ingredients: { ingredientId: number; amount: number }[];
  modifiers: { modifier: { id: number; name: string; price: number; category: { id: number; name: string } } }[];
  discounts: { discountId: number }[];
}

export default function AddMenu() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [status, setStatus] = useState("tersedia");
  const [category, setCategory] = useState("Coffee");
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>([]);
  const [availableIngredients, setAvailableIngredients] = useState<IngredientOption[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [showSuccessPopup, setShowSuccessPopup] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // State untuk diskon
  const [applyDiscount, setApplyDiscount] = useState<boolean>(false);
  const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>("");

  // State untuk modifier
  const [availableModifiers, setAvailableModifiers] = useState<ModifierOption[]>([]);
  const [selectedModifierIds, setSelectedModifierIds] = useState<number[]>([]); // Tetap array untuk mendukung beberapa modifier dari kategori berbeda

  const router = useRouter();
  const searchParams = useSearchParams();
  const menuId = searchParams ? searchParams.get("id") : null;

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

  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        const res = await fetch("/api/diskon");
        const data = await res.json();
        const menuDiscounts = data.filter((d: Discount) => d.scope === "MENU");
        setAvailableDiscounts(menuDiscounts);
      } catch (error) {
        console.error("Error fetching discounts:", error);
      }
    };
    fetchDiscounts();
  }, []);

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

  useEffect(() => {
    if (menuId) {
      const fetchMenu = async () => {
        try {
          const res = await fetch(`/api/getMenuOne?id=${menuId}`);
          const data = await res.json();
          if (res.ok && data.menu) {
            setIsEditMode(true);
            setName(data.menu.name);
            setDescription(data.menu.description || "");
            setPrice(data.menu.price.toString());
            setStatus(data.menu.Status);
            setCategory(data.menu.category);
            setIngredientRows(
              data.menu.ingredients.map((ing: any) => ({
                ingredientId: ing.ingredientId,
                amount: ing.amount,
              }))
            );
            setSelectedModifierIds(data.menu.modifiers.map((mod: any) => mod.modifier.id));
            setApplyDiscount(data.menu.discounts.length > 0);
            setSelectedDiscountId(
              data.menu.discounts.length > 0 ? data.menu.discounts[0].discountId.toString() : ""
            );
          } else {
            alert("Gagal memuat data menu");
          }
        } catch (error) {
          console.error("Error fetching menu:", error);
          alert("Gagal memuat data menu");
        }
      };
      fetchMenu();
    }
  }, [menuId]);

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

  const addModifier = (modifierId: number) => {
    if (!selectedModifierIds.includes(modifierId) && modifierId !== 0) {
      setSelectedModifierIds([...selectedModifierIds, modifierId]);
    }
  };

  const removeModifier = (modifierId: number) => {
    setSelectedModifierIds(selectedModifierIds.filter((id) => id !== modifierId));
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name || !price || (!isEditMode && !image)) {
      alert("Name, Price, dan Image (untuk tambah) wajib diisi!");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("price", parseFloat(price).toString());
    if (image) formData.append("image", image);
    formData.append("Status", status);
    formData.append("category", category);
    formData.append("ingredients", JSON.stringify(ingredientRows));
    formData.append("modifierIds", JSON.stringify(selectedModifierIds));
    if (isEditMode && menuId) formData.append("id", menuId);
    if (applyDiscount && selectedDiscountId) formData.append("discountId", selectedDiscountId);

    try {
      const res = await fetch("/api/addMenu", {
        method: isEditMode ? "PUT" : "POST",
        body: formData,
      });

      const data = await res.json();
      console.log("Response API:", data);

      if (res.ok) {
        setName("");
        setDescription("");
        setPrice("");
        setImage(null);
        setStatus("tersedia");
        setCategory("Coffee");
        setIngredientRows([]);
        setSelectedModifierIds([]);
        setApplyDiscount(false);
        setSelectedDiscountId("");
        setShowSuccessPopup(true);
        router.push("/manager/getMenu");
      } else {
        alert("Gagal menyimpan menu: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error submitting form:", error.message);
        alert("Terjadi kesalahan: " + error.message);
      } else {
        console.error("Error submitting form:", error);
        alert("Terjadi kesalahan yang tidak diketahui.");
      }
    }
  };

  // Kelompokkan modifier berdasarkan kategori
  const modifierGroups = availableModifiers.reduce((acc, mod) => {
    const categoryId = mod.category.id;
    if (!acc[categoryId]) {
      acc[categoryId] = { category: mod.category, modifiers: [] };
    }
    acc[categoryId].modifiers.push(mod);
    return acc;
  }, {} as { [key: number]: { category: ModifierCategory; modifiers: ModifierOption[] } });

  return (
    <div
      className="flex justify-center items-center min-h-screen bg-gray-200 p-4"
      style={{ marginLeft: isSidebarOpen ? "256px" : "80px" }}
    >
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-4xl">
        <Sidebar onToggle={toggleSidebar} isOpen={isSidebarOpen} />
        <h1 className="text-center text-2xl font-bold mb-6">
          {isEditMode ? "Edit Menu" : "Tambah Menu"}
        </h1>
        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <div className="grid grid-cols-2 gap-4">
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
              </label>
            </div>
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
            <div className="col-span-2">
              <label className="block font-semibold mb-2">
                Gambar: {!isEditMode && "(Wajib saat tambah)"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files) {
                      setImage(e.target.files[0]);
                    }
                  }}
                  required={!isEditMode}
                  className="w-full mt-1"
                />
              </label>
            </div>
          </div>

          {/* Ingredients Section */}
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Ingredients</h2>
            {ingredientRows.map((row, index) => {
              const selectedIngredient = availableIngredients.find(
                (ing) => ing.id === row.ingredientId
              );
              return (
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
                  <div className="flex items-center gap-2 flex-1">
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
                    {selectedIngredient?.unit && <span>{selectedIngredient.unit}</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeIngredientRow(index)}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={addIngredientRow}
              className="mt-4 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              Add Ingredient
            </button>
          </div>

          {/* Modifiers Section */}
          <div className="mt-6 border-t pt-4">
            <h2 className="text-xl font-semibold mb-4">Modifiers (Optional)</h2>
            {Object.entries(modifierGroups).map(([categoryId, group]) => (
              <div key={categoryId} className="mb-4">
                <label className="block font-semibold mb-2">
                  {group.category.name}:
                  <select
                    onChange={(e) => addModifier(parseInt(e.target.value))}
                    value={0}
                    className="w-full p-2 border border-gray-300 rounded mt-1"
                  >
                    <option value={0}>Pilih {group.category.name}</option>
                    {group.modifiers
                      .filter((mod) => !selectedModifierIds.includes(mod.id))
                      .map((mod) => (
                        <option key={mod.id} value={mod.id}>
                          {mod.name} (Rp{mod.price.toLocaleString()})
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            ))}
            {selectedModifierIds.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold">Modifier yang Dipilih:</h3>
                <ul className="list-disc pl-5">
                  {selectedModifierIds.map((modId) => {
                    const modifier = availableModifiers.find((m) => m.id === modId);
                    return (
                      <li key={modId} className="flex items-center justify-between py-1">
                        <span>
                          {modifier?.name} (Rp{modifier?.price.toLocaleString()}) - {modifier?.category.name}
                        </span>
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

          {/* Discount Section */}
          <div className="mt-6 border-t pt-4">
            <h2 className="text-xl font-semibold mb-4">Discount (Optional)</h2>
            <label className="flex items-center mb-4">
              <input
                type="checkbox"
                checked={applyDiscount}
                onChange={(e) => setApplyDiscount(e.target.checked)}
                className="mr-2"
              />
              Terapkan Diskon untuk Menu ini
            </label>
            {applyDiscount && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
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
                          {d.name} - {d.value} {d.type}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            {isEditMode ? "Simpan Perubahan" : "Tambah Menu"}
          </button>
        </form>
      </div>

      {showSuccessPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded shadow-md">
            <p className="mb-4">Menu berhasil {isEditMode ? "diperbarui" : "ditambahkan"}</p>
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              onClick={() => setShowSuccessPopup(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}