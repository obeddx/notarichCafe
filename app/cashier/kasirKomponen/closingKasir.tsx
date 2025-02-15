// /pages/cashier.tsx
"use client";
import { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import { FiBell } from "react-icons/fi";

interface Ingredient {
  id: number;
  name: string;
  stock: number; // stok akhir yang tersimpan di database
  unit: string;
}

interface Notification {
  message: string;
  date: string; // tanggal notifikasi dibuat
}

export default function CashierClosing() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [actualStocks, setActualStocks] = useState<Record<number, number>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);

  // Ambil data ingredient aktif dari API
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const res = await fetch("/api/bahan");
        const data = await res.json();
        setIngredients(data);
      } catch (error) {
        console.error("Error fetching ingredients:", error);
      }
    };
    fetchIngredients();
  }, []);

  // Muat notifikasi dari localStorage saat inisialisasi
  useEffect(() => {
    const storedNotifications = localStorage.getItem("notifications");
    if (storedNotifications) {
      setNotifications(JSON.parse(storedNotifications));
    }
  }, []);

  // Simpan notifikasi ke localStorage setiap kali notifikasi berubah
  useEffect(() => {
    localStorage.setItem("notifications", JSON.stringify(notifications));
  }, [notifications]);

  // Simpan input stok nyata untuk masing-masing ingredient
  const handleInputChange = (id: number, value: number) => {
    setActualStocks((prev) => ({ ...prev, [id]: value }));
  };

  // Saat submit, tampilkan konfirmasi terlebih dahulu, kemudian hitung selisih untuk setiap ingredient dan simpan notifikasi
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !window.confirm(
        "Periksa input Anda sebelum menekan Yes, perubahan tidak akan bisa diganti!"
      )
    ) {
      return;
    }

    const newNotifications: Notification[] = [];
    ingredients.forEach((ingredient) => {
      const actual = actualStocks[ingredient.id];
      if (actual !== undefined && actual !== ingredient.stock) {
        const diff = actual - ingredient.stock;
        const message = `Selisih untuk ${ingredient.name} adalah ${diff} unit.`;
        const date = new Date().toLocaleString();
        newNotifications.push({ message, date });
        toast.success("Berhasil Validasi Stock Nyata", { position: "top-right" });
        toast.error(message, { position: "top-right" });
      }
    });
    if (newNotifications.length > 0) {
      setNotifications((prev) => [...prev, ...newNotifications]);
    }
    setModalOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen p-4 relative">
      <Toaster />
      {/* Header: Tombol lonceng notifikasi */}
      <div className="flex justify-end mb-4">
        <button onClick={() => setNotificationModalOpen(true)} className="relative">
          <FiBell className="text-3xl text-gray-700" />
          {notifications.length > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full px-2 text-xs">
              {notifications.length}
            </span>
          )}
        </button>
      </div>

      {/* Konten utama (bisa ditambahkan konten lain jika diperlukan) */}
      <div className="flex-grow">
        {/* Konten tambahan bisa ditempatkan di sini */}
      </div>

      {/* Footer: Tombol Closing di bagian bawah halaman */}
      <div className="flex justify-center mt-4">
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
        >
          Closing
        </button>
      </div>

      {/* Modal Input Stock */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded shadow-md w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Input Stock Nyata Bahan</h2>
            <form onSubmit={handleSubmit}>
              {ingredients.map((ingredient) => (
                <div key={ingredient.id} className="mb-4">
                  {/* Hanya tampilkan nama bahan dan satuan */}
                  <label className="block font-medium mb-1">
                    {ingredient.name} ({ingredient.unit})
                  </label>
                  <input
                    type="number"
                    placeholder="Masukkan stok nyata"
                    onChange={(e) =>
                      handleInputChange(ingredient.id, Number(e.target.value))
                    }
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  />
                </div>
              ))}
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Notifikasi */}
      {notificationModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded shadow-md w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Notifications</h2>
            {notifications.length === 0 ? (
              <p>Tidak ada notifikasi</p>
            ) : (
              <ul className="space-y-2">
                {notifications.map((notif, idx) => (
                  <li key={idx} className="border-b pb-2">
                    <p>{notif.message}</p>
                    <p className="text-xs text-gray-500">{notif.date}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setNotificationModalOpen(false)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
