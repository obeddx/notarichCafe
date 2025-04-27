"use client";
import { useEffect, useState } from "react";

import EditMenuModal from "../componentsManager/editMenuModal";
import Sidebar from "@/components/sidebar";
import { FiSearch } from "react-icons/fi";
import toast from "react-hot-toast";

interface DiscountInfo {
  discount: {
    id: number;
    name: string;
    type: string;
    scope: string;
    value: number;
    isActive: boolean;
  };
}

interface Ingredient {
  id: number;
  name: string;
  unit: string;
}

interface MenuIngredient {
  id: number;
  amount: number;
  ingredient: Ingredient;
}

interface Modifier {
  modifier: {
    id: number;
    name: string;
  };
}

interface Menu {
  id: number;
  name: string;
  description: string;
  image: string;
  Status: string;
  price: number;
  hargaBakul: number;
  maxBeli: number;
  category: string;
  ingredients: MenuIngredient[];
  discounts: DiscountInfo[];
  modifiers: Modifier[];
}

export default function ManagerMenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editMenuId, setEditMenuId] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMenus, setFilteredMenus] = useState<Menu[]>([]);

  const fetchMenus = async () => {
    try {
      const res =await fetch("/api/hitungCost?type=NORMAL");

      const data = await res.json();
      setMenus(data);
      setFilteredMenus(data);
    } catch (error) {
      console.error("Error fetching menus:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  useEffect(() => {
    const filtered = menus.filter(
      (menu) =>
        menu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (menu.description &&
          menu.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredMenus(filtered);
  }, [searchQuery, menus]);

  const handleDelete = async (menuId: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus menu ini?")) return;

    try {
      const res = await fetch(`/api/getMenu/${menuId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMenus(menus.filter((menu) => menu.id !== menuId));
        toast.success('Menu Berhasil di Hapus')
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

  const handleCloseModal = () => {
    setEditMenuId(null);
  };

  const handleMenuUpdated = () => {
    fetchMenus();
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4 mt-[85px]" style={{ marginLeft: isSidebarOpen ? "256px" : "80px" }}>
      <h1 className="text-2xl font-bold mb-4">Daftar Menu</h1>
      <Sidebar onToggle={toggleSidebar} isOpen={isSidebarOpen} />
      
      <button
          onClick={() => window.location.href = "/manager/addMenu"}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          Add New Menu
        </button>
      <div className="flex justify-end mb-6">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            placeholder="Cari menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            className="absolute right-0 top-0 mt-3 mr-3 text-gray-500"
          >
            <FiSearch size={20} />
          </button>
        </div>
      </div>
      <table className="min-w-full border border-gray-300 divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gambar</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deskripsi</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga Jual</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga Bakul</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diskon</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredients</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modifiers</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredMenus.map((menu) => (
            <tr key={menu.id}>
              <td className="px-6 py-4 whitespace-nowrap">{menu.id}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                {menu.image ? (
                  <img src={menu.image} alt={menu.name} className="w-16 h-16 object-cover rounded" />
                ) : (
                  "No Image"
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">{menu.name}</td>
              <td className="px-6 py-4 whitespace-nowrap">{menu.description}</td>
              <td className="px-6 py-4 whitespace-nowrap">{menu.maxBeli}</td>
              <td className="px-6 py-4 whitespace-nowrap">{menu.Status}</td>
              <td className="px-6 py-4 whitespace-nowrap">{menu.category}</td>
              <td className="px-6 py-4 whitespace-nowrap">{menu.price}</td>
              <td className="px-6 py-4 whitespace-nowrap">{menu.hargaBakul}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                {menu.discounts && menu.discounts.length > 0 ? (
                  menu.discounts.map((d, index) => (
                    <span key={d.discount.id}>
                      {d.discount.name} ({d.discount.value}
                      {d.discount.type === "PERCENTAGE" ? "%" : ""})
                      {index < menu.discounts.length - 1 && ", "}
                    </span>
                  ))
                ) : (
                  "Tidak ada diskon"
                )}
              </td>
              <td className="px-6 py-4">
                {menu.ingredients.map((item, index) => (
                  <span key={item.id}>
                    {item.ingredient.name} ({item.amount} {item.ingredient.unit})
                    {index < menu.ingredients.length - 1 && ", "}
                  </span>
                ))}
              </td>
              <td className="px-6 py-4">
                {menu.modifiers && menu.modifiers.length > 0 ? (
                  menu.modifiers.map((mod, index) => (
                    <span key={mod.modifier.id}>
                      {mod.modifier.name}
                      {index < menu.modifiers.length - 1 && ", "}
                    </span>
                  ))
                ) : (
                  "Tidak ada modifier"
                )}
              </td>
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
          {filteredMenus.length === 0 && (
            <tr>
              <td colSpan={13} className="px-6 py-4 text-center">
                Tidak ada data menu.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <br />
      {editMenuId !== null && (
        <EditMenuModal
          menuId={editMenuId}
          onCloseAction={handleCloseModal} // Ubah nama prop
          onMenuUpdatedAction={handleMenuUpdated} // Ubah nama prop
        />
      )}
    </div>
  );
}