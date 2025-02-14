"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import EditMenuModal from "../componentsManager/editMenuModal";
import Sidebar from "@/components/sidebar";

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
  const [editMenuId, setEditMenuId] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true); // State untuk sidebar

  const fetchMenus = async () => {
    try {
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

  const handleEdit = (menuId: number) => {
    setEditMenuId(menuId);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4 mt-[85px]" style={{ marginLeft: isSidebarOpen ? '256px' : '80px' }}>
      <h1 className="text-2xl font-bold mb-4">Menu Manager</h1>
      <Sidebar onToggle={toggleSidebar} isOpen={isSidebarOpen} />
      <Link href="/manager/addMenu">
        <p className="text-blue-500 hover:underline pb-4">+ Tambah Menu Baru</p>
      </Link>
      <table className="min-w-full border border-gray-300 divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gambar Menu</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Menu</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredients</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {menus.map((menu) => (
            <tr key={menu.id}>
              <td className="px-6 py-4 whitespace-nowrap">{menu.id}</td>
              <td className="px-6 py-4 whitespace-nowrap">{menu.image ? <img src={menu.image} alt={menu.name} className="w-16 h-16 object-cover rounded" /> : "No Image"}</td>
              <td className="px-6 py-4 whitespace-nowrap">{menu.name}</td>
              <td className="px-6 py-4 whitespace-nowrap">{menu.Status}</td>
              <td className="px-6 py-4 whitespace-nowrap">{menu.category}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                {menu.ingredients.map((item, index) => (
                  <span key={item.id}>
                    {item.ingredient.name} ({item.amount} {item.ingredient.unit}){index < menu.ingredients.length - 1 && ", "}
                  </span>
                ))}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <button onClick={() => handleEdit(menu.id)} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded mr-2">
                  Edit
                </button>
                <button onClick={() => handleDelete(menu.id)} className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded">
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
      {editMenuId !== null && <EditMenuModal menuId={editMenuId} onClose={() => setEditMenuId(null)} onMenuUpdated={fetchMenus} />}
    </div>
  );
}