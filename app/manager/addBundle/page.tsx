'use client';
import { useState, useEffect, FormEvent } from "react";
import toast, { Toaster } from "react-hot-toast";
import Sidebar from "@/components/sidebar";
import Link from "next/link";

interface MenuOption {
  id: number;
  name: string;
}

interface BundleMenuRow {
  menuId: number;
  quantity: number;
}

export default function AddBundle() {
  const [bundleName, setBundleName] = useState("");
  const [description, setDescription] = useState("");
  const [bundlePrice, setBundlePrice] = useState(""); // optional, dikonversi ke number jika diisi
  const [menuRows, setMenuRows] = useState<BundleMenuRow[]>([]);
  const [availableMenus, setAvailableMenus] = useState<MenuOption[]>([]);
  // State untuk file gambar
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true); // State untuk sidebar

  // Ambil daftar menu dari API (misalnya endpoint /api/menus)
  useEffect(() => {
    async function fetchMenus() {
      try {
        const res = await fetch("/api/getMenu");
        const data = await res.json();
        setAvailableMenus(data);
      } catch (error) {
        console.error("Error fetching menus:", error);
      }
    }
    fetchMenus();
  }, []);

  const addMenuRow = () => {
    setMenuRows([...menuRows, { menuId: 0, quantity: 1 }]);
  };

  const updateMenuRow = (index: number, field: keyof BundleMenuRow, value: number) => {
    const newRows = [...menuRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setMenuRows(newRows);
  };

  const removeMenuRow = (index: number) => {
    const newRows = menuRows.filter((_, i) => i !== index);
    setMenuRows(newRows);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!bundleName) {
      toast.error("Nama paket harus diisi");
      return;
    }
    if (menuRows.length < 2) {
      toast.error("Paket harus terdiri dari minimal 2 menu");
      return;
    }
    // Validasi setiap baris harus memiliki menuId yang valid dan quantity > 0
    for (const row of menuRows) {
      if (row.menuId === 0 || row.quantity <= 0) {
        toast.error("Pilih menu dan pastikan quantity > 0 untuk setiap baris");
        return;
      }
    }

    // Buat FormData untuk mengirim data beserta file gambar
    const formData = new FormData();
    formData.append("name", bundleName);
    formData.append("description", description);
    formData.append("bundlePrice", bundlePrice ? bundlePrice : "");
    formData.append("menuSelections", JSON.stringify(menuRows));
    if (imageFile) {
      formData.append("image", imageFile);
    }

    try {
      const res = await fetch("/api/addBundle", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (res.ok) {
        toast.success("Paket bundling berhasil dibuat!");
        // Reset form
        setBundleName("");
        setDescription("");
        setBundlePrice("");
        setMenuRows([]);
        setImageFile(null);
      } else {
        toast.error(result.message || "Gagal membuat paket bundling");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Terjadi kesalahan saat membuat paket bundling");
    }
  };
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="p-4 mt-[85px]" style={{ marginLeft: isSidebarOpen ? '256px' : '80px' }}>
      <h1 className="text-2xl font-bold mb-4 text-center">Tambah Paket Bundling</h1>
      <Sidebar onToggle={toggleSidebar} isOpen={isSidebarOpen} />
      <Link href="/manager/addBahan">
        <p className="text-blue-500 hover:underline pb-4">+ Tambah Ingredient Baru</p>
      </Link>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block font-medium mb-1">Nama Paket:</label>
          <input
            type="text"
            value={bundleName}
            onChange={(e) => setBundleName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block font-medium mb-1">Deskripsi Paket:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            rows={3}
          />
        </div>

        <div className="mb-4">
          <label className="block font-medium mb-1">Harga Paket (opsional):</label>
          <input
            type="number"
            value={bundlePrice}
            onChange={(e) => setBundlePrice(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            step="any"
            placeholder="Jika ada harga khusus paket"
          />
        </div>

        {/* Field untuk input file gambar */}
        <div className="mb-4">
          <label className="block font-medium mb-1">Gambar Paket:</label>
          <input
            type="file"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setImageFile(e.target.files[0]);
              }
            }}
            className="w-full p-2 border border-gray-300 rounded"
            accept="image/*"
          />
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Menu dalam Paket</h2>
          {menuRows.map((row, index) => (
            <div key={index} className="flex gap-4 items-center mb-2">
              <select
                value={row.menuId}
                onChange={(e) =>
                  updateMenuRow(index, "menuId", parseInt(e.target.value))
                }
                className="flex-1 p-2 border border-gray-300 rounded"
                required
              >
                <option value={0}>Pilih Menu</option>
                {availableMenus.map((menu) => (
                  <option key={menu.id} value={menu.id}>
                    {menu.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={row.quantity}
                onChange={(e) =>
                  updateMenuRow(index, "quantity", parseInt(e.target.value))
                }
                className="w-24 p-2 border border-gray-300 rounded"
                min="1"
                required
              />
              <button
                type="button"
                onClick={() => removeMenuRow(index)}
                className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
              >
                Hapus
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addMenuRow}
            className="mt-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
          >
            Tambah Menu
          </button>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded"
        >
          Buat Paket
        </button>
      </form>
      <Toaster position="top-right" />
    </div>
  );
}
