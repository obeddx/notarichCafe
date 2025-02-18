'use client'
import { useEffect, useState } from "react";
import Image from 'next/image';
import { FiSearch } from "react-icons/fi";
import Sidebar from "@/components/sidebar";
import Link from "next/link";

// Definisi tipe data
interface Menu {
  id: number;
  name: string;
  hargaBakul: number;
}

interface BundleMenu {
  id: number;
  menuId: number;
  quantity: number;
  menu?: Menu;
}

interface Bundle {
  id: number;
  name: string;
  description?: string;
  image: string;
  bundlePrice?: number;
  isActive: boolean;
  bundleMenus: BundleMenu[];
}

// Tipe data untuk form edit bundle
interface EditBundleForm {
  name: string;
  description: string;
  bundlePrice: number;
  menus: { menuId: number; quantity: number }[];
  imagePreview: string; // URL preview gambar saat ini atau gambar baru
  imageFile: File | null; // File gambar baru (jika diubah)
}

const BundlesPage = () => {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [availableMenus, setAvailableMenus] = useState<Menu[]>([]);
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true); // State untuk sidebar
  const [filteredBundle, setFilteredBundle] = useState<Bundle[]>([]);
  const [editFormData, setEditFormData] = useState<EditBundleForm>({
    name: "",
    description: "",
    bundlePrice: 0,
    menus: [],
    imagePreview: "",
    imageFile: null,
  });

  // Ambil data bundle saat komponen pertama kali dimuat
  useEffect(() => {
    fetchBundles();
  }, []);

  // Ambil daftar menu yang tersedia untuk dipilih di form
  useEffect(() => {
    fetchAvailableMenus();
  }, []);

  const fetchBundles = async () => {
    try {
      const response = await fetch("/api/bundles");
      if (!response.ok) {
        throw new Error("Error fetching bundles");
      }
      const data = await response.json();
      setBundles(data);
      setFilteredBundle(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const filtered = bundles.filter((bundle) =>
      bundle.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredBundle(filtered);
  }, [searchQuery, bundles]);

  const fetchAvailableMenus = async () => {
    try {
      const response = await fetch("/api/getMenu");
      if (!response.ok) {
        throw new Error("Error fetching menus");
      }
      const data = await response.json();
      setAvailableMenus(data);
    } catch (error) {
      console.error(error);
    }
  };

  // Buka modal edit dan isi form dengan data bundle terpilih
  const openEditModal = (bundle: Bundle) => {
    setSelectedBundle(bundle);
    setEditFormData({
      name: bundle.name,
      description: bundle.description || "",
      bundlePrice: bundle.bundlePrice || 0,
      menus: bundle.bundleMenus.map((bm) => ({
        menuId: bm.menuId,
        quantity: bm.quantity,
      })),
      imagePreview: bundle.image,
      imageFile: null,
    });
    setIsEditModalOpen(true);
  };

  // Buka modal delete untuk konfirmasi soft delete
  const openDeleteModal = (bundle: Bundle) => {
    setSelectedBundle(bundle);
    setIsDeleteModalOpen(true);
  };

  const closeModals = () => {
    setSelectedBundle(null);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
  };

  // Tangani perubahan input di form edit (untuk field teks dan number)
  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: name === "bundlePrice" ? Number(value) : value,
    }));
  };

  // Tangani perubahan file gambar
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditFormData((prev) => ({
        ...prev,
        imageFile: file,
        imagePreview: URL.createObjectURL(file),
      }));
    }
  };

  // Tangani perubahan untuk field menu (select dan quantity) di dalam array menus
  const handleMenuChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>,
    index: number
  ) => {
    const { name, value } = e.target;
    setEditFormData((prev) => {
      const newMenus = [...prev.menus];
      newMenus[index] = {
        ...newMenus[index],
        [name]: Number(value),
      };
      return { ...prev, menus: newMenus };
    });
  };

  // Tambahkan baris baru untuk menu di form edit
  const addMenuRow = () => {
    setEditFormData((prev) => ({
      ...prev,
      menus: [...prev.menus, { menuId: 0, quantity: 1 }],
    }));
  };

  // Hapus baris menu dari form edit
  const removeMenuRow = (index: number) => {
    setEditFormData((prev) => {
      const newMenus = prev.menus.filter((_, i) => i !== index);
      return { ...prev, menus: newMenus };
    });
  };

  // Submit form edit untuk update bundle (termasuk update bundleMenus)
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBundle) return;

    // Bila ada file gambar baru, gunakan FormData agar file dapat dikirim
    const formData = new FormData();
    formData.append("name", editFormData.name);
    formData.append("description", editFormData.description);
    formData.append("bundlePrice", String(editFormData.bundlePrice));
    // Append data menu dalam bentuk JSON string
    formData.append("menus", JSON.stringify(editFormData.menus));
    // Append file gambar jika ada, jika tidak, backend bisa menggunakan imagePreview yang sudah ada
    if (editFormData.imageFile) {
      formData.append("image", editFormData.imageFile);
    }

    try {
      const response = await fetch(`/api/bundles/${selectedBundle.id}`, {
        method: "PUT",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Error updating bundle");
      }
      closeModals();
      fetchBundles();
    } catch (error) {
      console.error(error);
    }
  };

  // Lakukan soft delete dengan mengubah isActive menjadi false
  const handleDelete = async () => {
    if (!selectedBundle) return;
    try {
      const response = await fetch(`/api/bundles/${selectedBundle.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Error deleting bundle");
      }
      closeModals();
      fetchBundles();
    } catch (error) {
      console.error(error);
    }
  };
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="p-4 mt-[85px]" style={{ marginLeft: isSidebarOpen ? '256px' : '80px' }}>
      <h1 className="text-3xl font-bold mb-6 text-center">Daftar Bundle</h1>
      <Sidebar onToggle={toggleSidebar} isOpen={isSidebarOpen} />
      <Link href="/manager/addBundle">
        <p className="text-blue-500 hover:underline pb-4">+ Tambah Bundle Baru</p>
      </Link>
      <div className="flex justify-end mb-6">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            placeholder="Cari bundle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="button" className="absolute right-0 top-0 mt-3 mr-3 text-gray-500">
            <FiSearch size={20} />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto shadow-md rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Nama</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Deskripsi</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Gambar</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Harga Bundle</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">HPP / Harga Bakul</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Daftar Menu</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
          {filteredBundle.length === 0 ? (
          <tr>
            <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
              Tidak ada data bundle
            </td>
          </tr>
        ) : (
          filteredBundle.map((bundle) => (
            <tr key={bundle.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bundle.id}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{bundle.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bundle.description}</td>
              <td className="px-6 py-4 whitespace-nowrap">
              <Image
                  src={bundle.image}
                  alt={bundle.name}
                  width={64} // Set width to match your desired size
                  height={64} // Set height to match your desired size
                  className="object-cover rounded-md"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {bundle.bundlePrice !== undefined ? bundle.bundlePrice : "-"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {bundle.bundleMenus
                  .reduce((total, bm) => total + (bm.menu?.hargaBakul ?? 0) * bm.quantity, 0)
                  .toLocaleString("id-ID", { style: "currency", currency: "IDR" })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {bundle.bundleMenus.map((bm) => (
                  <div key={bm.id}>
                    {bm.menu?.name || `Menu ${bm.menuId}`} (x{bm.quantity})
                  </div>
                ))}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md mr-2 transition-colors"
                  onClick={() => openEditModal(bundle)}
                >
                  Edit
                </button>
                <button
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md transition-colors"
                  onClick={() => openDeleteModal(bundle)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))
        )}
          </tbody>
        </table>
      </div>

      {/* Modal Edit Bundle */}
      {isEditModalOpen && selectedBundle && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg overflow-auto max-h-full">
            <h2 className="text-2xl font-bold mb-4">Edit Bundle</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="mb-4">
                <label className="block mb-1 font-medium">Nama:</label>
                <input
                  type="text"
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditChange}
                  className="border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-medium">Deskripsi:</label>
                <textarea
                  name="description"
                  value={editFormData.description}
                  onChange={handleEditChange}
                  className="border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-medium">Gambar:</label>
                <input
                  type="file"
                  name="image"
                  onChange={handleImageChange}
                  className="border rounded-md px-3 py-2 w-full"
                  accept="image/*"
                />
                {editFormData.imagePreview && (
                 <Image
                 src={editFormData.imagePreview}
                 alt="Preview"
                 width={128}  // Sesuaikan ukuran sesuai kebutuhan
                 height={128} // Sesuaikan ukuran sesuai kebutuhan
                 className="object-cover mt-2 rounded-md"
               />
                )}
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-medium">Harga Bundle:</label>
                <input
                  type="number"
                  name="bundlePrice"
                  value={editFormData.bundlePrice}
                  onChange={handleEditChange}
                  className="border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Bagian untuk edit daftar menu yang digunakan dalam bundle */}
              <div className="mb-4">
                <h3 className="font-bold text-lg mb-2">Menu yang Digunakan</h3>
                {editFormData.menus.map((menuItem, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <select
                      name="menuId"
                      value={menuItem.menuId}
                      onChange={(e) => handleMenuChange(e, index)}
                      className="border rounded-md px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      name="quantity"
                      value={menuItem.quantity}
                      onChange={(e) => handleMenuChange(e, index)}
                      className="border rounded-md px-3 py-2 w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removeMenuRow(index)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addMenuRow}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition-colors mt-2"
                >
                  Tambah Menu
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={closeModals}
                  className="mr-3 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Batal
                </button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Delete (Konfirmasi Soft Delete) */}
      {isDeleteModalOpen && selectedBundle && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
            <h2 className="text-2xl font-bold mb-4">Konfirmasi Hapus Bundle</h2>
            <p className="mb-4">
              Apakah Anda yakin ingin menghapus bundle{" "}
              <strong>{selectedBundle.name}</strong>?
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={closeModals}
                className="mr-3 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-md transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BundlesPage;
