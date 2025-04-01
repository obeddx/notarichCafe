"use client";
import { useEffect, useState } from "react";
import SidebarCashier from "@/components/sidebarCashier";
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
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMenus, setFilteredMenus] = useState<Menu[]>([]);

  const fetchMenus = async () => {
    try {
      const res = await fetch("/api/bundles");
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

  const handleToggleStatus = async (menuId: number, currentStatus: string) => {
    const newStatus = currentStatus === "Tersedia" ? "Habis" : "Tersedia";

    try {
      const res = await fetch(`/api/getMenu/${menuId}`, {
        method: "PATCH", // Menggunakan PATCH untuk update sebagian data
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ Status: newStatus }),
      });

      if (res.ok) {
        // Update state lokal setelah sukses
        setMenus(menus.map(menu => 
          menu.id === menuId ? { ...menu, Status: newStatus } : menu
        ));
        setFilteredMenus(filteredMenus.map(menu => 
          menu.id === menuId ? { ...menu, Status: newStatus } : menu
        ));
      } else {
        toast.error("Gagal mengubah status menu.");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Terjadi kesalahan saat mengubah status.");
    }
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
      <SidebarCashier isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      
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
              <td className="px-6 py-4 whitespace-nowrap">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={menu.Status === "Tersedia" || menu.Status === "tersedia"}
                    onChange={() => handleToggleStatus(menu.id, menu.Status)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                <span className="ml-3 text-sm font-medium text-gray-900">
                    {menu.Status === "Tersedia" || menu.Status === "tersedia" ? "On" : "Off"}
                </span>
                </label>
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
    </div>
  );
}