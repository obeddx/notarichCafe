// /pages/manager/menus.tsx
'use client'
import { useEffect, useState } from "react";
import Link from "next/link";
import EditMenuModal from "../componentsManager/editMenuModal";

// Update interface dengan properti image, status, dan category
interface Ingredient {
  id: number;
  name: string;
  unit: string; // unit disimpan di dalam objek ingredient
}

interface MenuIngredient {
  id: number;
  amount: number; // jumlah ingredient
  ingredient: Ingredient;
}

interface Menu {
  id: number;
  name: string;
  image: string;
  Status: string;
  category: string;
  ingredients: MenuIngredient[];
}

export default function ManagerMenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // State untuk menyimpan id menu yang akan diedit (jika null, modal tidak tampil)
  const [editMenuId, setEditMenuId] = useState<number | null>(null);

  // Fungsi untuk mengambil data menu dari API
  const fetchMenus = async () => {
    try {
      // Pastikan endpoint API yang dipanggil sudah benar
      const res = await fetch("/api/getMenu");
      const data = await res.json();
      setMenus(data);
    } catch (error) {
      console.error("Error fetching menus:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  // Fungsi untuk meng-handle aksi delete
  const handleDelete = async (menuId: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus menu ini?")) return;

    try {
      const res = await fetch(`/api/getMenu/${menuId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMenus(menus.filter((menu) => menu.id !== menuId));
      } else {
        alert("Gagal menghapus menu.");
      }
    } catch (error) {
      console.error("Error deleting menu:", error);
    }
  };

  // Fungsi untuk meng-handle aksi edit
  const handleEdit = (menuId: number) => {
    setEditMenuId(menuId);
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4 mt-[85px]">
      <h1 className="text-2xl font-bold mb-4">Menu Manager</h1>
      <Link href="/manager/addMenu">
        <p className="text-blue-500 hover:underline pb-4">+ Tambah Menu Baru</p>
      </Link>
      <table className="min-w-full border border-gray-300 divide-y divide-gray-200">
        <thead className="bg-gray-50">
            
          <tr>
            {/* Kolom ID */}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ID
            </th>
            {/* Kolom Gambar Menu */}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Gambar Menu
            </th>
            {/* Kolom Nama Menu */}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nama Menu
            </th>
            {/* Kolom Status */}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            {/* Kolom Category */}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            {/* Kolom Ingredients */}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ingredients
            </th>
            {/* Kolom Aksi */}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {menus.map((menu) => (
            <tr key={menu.id}>
              {/* ID */}
              <td className="px-6 py-4 whitespace-nowrap">{menu.id}</td>
              {/* Gambar Menu */}
              <td className="px-6 py-4 whitespace-nowrap">
                {menu.image ? (
                  <img
                    src={menu.image}
                    alt={menu.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                ) : (
                  "No Image"
                )}
              </td>
              {/* Nama Menu */}
              <td className="px-6 py-4 whitespace-nowrap">{menu.name}</td>
              {/* Status */}
              <td className="px-6 py-4 whitespace-nowrap">{menu.Status}</td>
              {/* Category */}
              <td className="px-6 py-4 whitespace-nowrap">{menu.category}</td>
              {/* Ingredients */}
              <td className="px-6 py-4 whitespace-nowrap">
                {menu.ingredients.map((item, index) => (
                  <span key={item.id}>
                    {item.ingredient.name} ({item.amount} {item.ingredient.unit})
                    {index < menu.ingredients.length - 1 && ", "}
                  </span>
                ))}
              </td>
              {/* Aksi */}
              <td className="px-6 py-4 whitespace-nowrap">
                <button
                  onClick={() => handleEdit(menu.id)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded mr-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(menu.id)}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {menus.length === 0 && (
            <tr>
              <td colSpan={7} className="px-6 py-4 text-center">
                Tidak ada data menu.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <br />
      {/* Link untuk menambahkan menu baru */}
     

        {/* Render modal edit jika editMenuId tidak null */}
      {editMenuId !== null && (
        <EditMenuModal
          menuId={editMenuId}
          onClose={() => setEditMenuId(null)}
          onMenuUpdated={fetchMenus}
        />
      )}
    </div>
  );
}
