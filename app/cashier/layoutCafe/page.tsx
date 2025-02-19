"use client";

import { useState, useEffect } from "react";
import SidebarCashier from "@/components/sidebarCashier";
import toast from "react-hot-toast";
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"] });
import Link from "next/link";

interface Order {
  id: number;
  tableNumber: string;
  total: number;
  status: string;
  paymentMethod?: string;
  paymentId?: string;
  createdAt: string;
  orderItems: OrderItem[];
}

interface OrderItem {
  id: number;
  menuId: number;
  quantity: number;
  note?: string;
  menu: Menu;
}

interface Menu {
  id: number;
  name: string;
  description?: string;
  image: string;
  price: number;
  category: string;
  Status: string;
}

const Bookinge = () => {
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [selectedTableOrders, setSelectedTableOrders] = useState<Order[]>([]);
  const [selectedCompletedOrders, setSelectedCompletedOrders] = useState<Order[]>([]);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [selectedTableNumber, setSelectedTableNumber] = useState<string>("");
  const [manuallyMarkedTables, setManuallyMarkedTables] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // State untuk mengontrol sidebar

  const markTableAsOccupied = async (tableNumber: string) => {
    try {
      const response = await fetch('/api/nomeja', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tableNumber }),
      });
  
      if (response.ok) {
        const updated = [...manuallyMarkedTables, tableNumber];
        setManuallyMarkedTables(updated);
        localStorage.setItem("manuallyMarkedTables", JSON.stringify(updated));
        toast.success("Meja berhasil ditandai sebagai terisi!");
      } else {
        throw new Error("Gagal menyimpan data meja");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Gagal menyimpan data meja");
    }
  };
  
  const resetTable = async (tableNumber: string) => {
    try {
      const response = await fetch('/api/nomeja', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nomorMeja: tableNumber }),
      });
  
      if (response.ok) {
        const updated = manuallyMarkedTables.filter(t => t !== tableNumber);
        setManuallyMarkedTables(updated);
        localStorage.setItem("manuallyMarkedTables", JSON.stringify(updated));
        fetchData();
        toast.success("Meja berhasil direset!");
      } else {
        throw new Error("Gagal menghapus data meja");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Gagal menghapus data meja");
    }
  };
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  // Fetch initial data

  // Load manually marked tables from localStorage on component mount
  useEffect(() => {
    const savedMarkedTables = localStorage.getItem("manuallyMarkedTables");
    if (savedMarkedTables) {
      setManuallyMarkedTables(JSON.parse(savedMarkedTables));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);
  
// Save to localStorage whenever manuallyMarkedTables changes
useEffect(() => {
  localStorage.setItem("manuallyMarkedTables", JSON.stringify(manuallyMarkedTables));
}, [manuallyMarkedTables]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mejaRes, ordersRes] = await Promise.all([fetch("/api/nomeja"), fetch("/api/orders")]);
    
        if (!mejaRes.ok) throw new Error("Gagal mengambil data meja");
        if (!ordersRes.ok) throw new Error("Gagal mengambil data pesanan");
    
        const ordersData = await ordersRes.json();
        setAllOrders(ordersData.orders);
      } catch (error) {
        console.error("Terjadi kesalahan:", error);
      }
    };
    // Panggil fetchData setiap kali komponen dimuat atau ada perubahan
    fetchData();
  }, []); // Hapus dependency array jika perlu pembaruan real-time

  // Di dalam komponen Bookinge
  const getTableColor = (nomorMeja: number) => {
    const tableNumberStr = nomorMeja.toString();
  
    // Prioritaskan tabel yang ditandai manual
    if (manuallyMarkedTables.includes(tableNumberStr)) {
      return "bg-[#D02323]"; // Warna merah untuk meja terisi
    }
  
    const tableOrders = allOrders.filter(order =>
      order.tableNumber === tableNumberStr
    );
  
    const hasActiveOrders = tableOrders.some(order =>
      order.status !== "Selesai"
    );
  
    const isTableReset = tableOrders.length === 0;
  
    return hasActiveOrders || !isTableReset ? "bg-[#D02323]" : "bg-green-800"; // Warna hijau untuk meja tersedia
  };
  // Tambahkan fungsi fetchData yang bisa diakses global
  const fetchData = async () => {
    try {
      const [mejaRes, ordersRes] = await Promise.all([fetch("/api/nomeja"), fetch("/api/orders")]);
  
      if (!mejaRes.ok) throw new Error("Gagal mengambil data meja");
      if (!ordersRes.ok) throw new Error("Gagal mengambil data pesanan");
  
      const ordersData = await ordersRes.json();
      setAllOrders(ordersData.orders);
    } catch (error) {
      console.error("Terjadi kesalahan:", error);
    }
  };
  const fetchTableOrders = async (tableNumber: string) => {
    try {
      setSelectedTableNumber(tableNumber);
      setIsPopupVisible(true);

      // Reset data pesanan sebelum mengambil yang baru
      setSelectedTableOrders([]);
      setSelectedCompletedOrders([]);

      const response = await fetch(`/api/orders?tableNumber=${tableNumber}`);
      if (!response.ok) throw new Error("Gagal mengambil data pesanan");

      const data = await response.json();

      // Pastikan response hanya berisi pesanan untuk meja yang dipilih
      const tableOrders = data.orders.filter((order: Order) => order.tableNumber === tableNumber.toString());

      const activeOrders = tableOrders.filter((order: Order) => order.status !== "Selesai");
      const completedOrders = tableOrders.filter((order: Order) => order.status === "Selesai");

      setSelectedTableOrders(activeOrders);
      setSelectedCompletedOrders(completedOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Gagal memuat data pesanan");
    }
  };

  const markOrderAsCompleted = async (orderId: number) => {
    try {
      const res = await fetch("/api/completeOrder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      if (res.ok) {
        // Refresh data
        const [ordersRes, tableRes] = await Promise.all([fetch("/api/orders"), fetch(`/api/orders?tableNumber=${selectedTableNumber}`)]);

        setAllOrders((await ordersRes.json()).orders);
        const tableData = await tableRes.json();

        setSelectedTableOrders(tableData.orders.filter((o: Order) => o.status !== "Selesai"));
        setSelectedCompletedOrders(tableData.orders.filter((o: Order) => o.status === "Selesai"));

        toast.success("Pesanan berhasil diselesaikan!");
      } else {
        throw new Error("Gagal menyelesaikan pesanan");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Gagal menyelesaikan pesanan");
    }
  };
  const OrderCard = ({ order }: { order: Order; isCompleted?: boolean; onComplete?: () => void }) => (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-[#FFEED9] mb-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-semibold">Order ID: {order.id}</p>
          <p className="text-sm text-gray-600">
            {new Date(order.createdAt).toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm ${order.status === "pending" ? "bg-yellow-500" : order.status === "Sedang Diproses" ? "bg-blue-500" : "bg-green-500"} text-white`}>{order.status}</span>
      </div>

      <div className="border-t pt-3 mt-3">
        <h3 className="font-semibold mb-2">Item Pesanan:</h3>
        <div className="grid gap-2">
          {order.orderItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <img src={item.menu.image} alt={item.menu.name} className="w-12 h-12 object-cover rounded" />
              <div className="flex-1">
                <p className="font-medium">{item.menu.name}</p>
                <p className="text-sm text-gray-600">
                  {item.quantity} x Rp {item.menu.price.toLocaleString()}
                </p>
                {item.note && <p className="text-sm text-gray-500">Catatan: {item.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t pt-3 mt-3 flex justify-between items-center">
        <p className="text-lg font-bold">Total: Rp {order.total.toLocaleString()}</p>
      </div>
    </div>
  );
  return (
    <div className="flex flex-col md:flex-row h-screen min-w-[1400px]">
      <div className={`flex h-screen ${inter.className} min-w-[1400px]`}>
        {/* Sidebar */}
        <div className={`fixed h-full bg-[#2A2A2A] shadow-xl flex-shrink-0 transition-all duration-300 ${isSidebarOpen ? "w-64" : "w-20"
          }`}>
          <SidebarCashier isOpen={isSidebarOpen} onToggle={toggleSidebar} />
        </div>
        {/* Main Content */}
        <div className={`flex-1 p-8 transition-all duration-300 ${isSidebarOpen ? "ml-64" : "ml-20"
          }`}>
          <div className="w-full sm:px-6 lg:px-28">
            <h2 className="text-4xl font-bold mb-8 text-[#2A2A2A] drop-shadow-sm">🪑 Pilih Meja Anda</h2>

            {/* Floor Selection - Diperbarui */}
            <div className="mb-8 flex gap-6 border-b-2 border-[#FFEED9] pb-4">
              {[1, 2].map((floor) => (
                <label
                  key={floor}
                  className={`flex items-center space-x-2 px-5 py-2 rounded-full transition-all ${selectedFloor === floor ? "bg-[#FF8A00] text-white shadow-md" : "bg-[#FFEED9] text-[#666] hover:bg-[#FFE4C4]"} cursor-pointer`}
                >
                  <input type="radio" name="floor" value={floor} checked={selectedFloor === floor} onChange={() => setSelectedFloor(floor)} className="hidden" />
                  <span>Lantai {floor}</span>
                </label>
              ))}
            </div>

            {/* Floor Layout - Diperbarui */}
            <div className="flex flex-col lg:w-full bg-[#FFF5E6] rounded-3xl shadow-lg transform transition-all duration-300 hover:shadow-xl overflow-hidden">
              {selectedFloor === 1 ? (
                <>
                  <div className="xs:w-[1300px] lg:w-full flex flex-row px-40 py-28 space-x-8">
                    {/* Lantai 1 - Bagian Kiri */}
                    <div className="w-1/2 flex flex-col lg:items-start">
                      <div className="flex flex-row">
                        <div className="relative flex items-center justify-center bg-gradient-to-r from-gray-300 to-gray-100 px-44 py-2 rounded-lg shadow-lg transform transition duration-300 hover:scale-105">
                          <span className="text-2xl font-bold text-gray-700">Tangga</span>
                        </div>
                      </div>
                      <div className="flex flex-row mt-6">
                        <div className="flex flex-col items-center justify-center bg-white rounded-lg border-4 border-gray-300 px-20 py-4 shadow-lg transform transition duration-300 hover:scale-105">
                          <span className="text-4xl">🚽</span>
                          <span className="mt-2 text-xl font-bold text-gray-700">Toilet</span>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex flex-row mt-10">
                          <div className="flex flex-col justify-center items-center mx-4">
                            {/* Meja 1 */}
                            <div className="flex items-center space-x-2 mb-2">
                              <div className="w-8 h-20 bg-amber-600 rounded-t-lg shadow-md" />
                              <button
                                onClick={() => fetchTableOrders("1")}
                                className={`w-12 h-20 ${getTableColor(1)} rounded-lg transform transition-all 
                                hover:scale-105 hover:shadow-lg relative group`}
                              >
                                <p className="font-bold text-white text-center pt-2">1</p>
                                <div className="absolute inset-0 border-2 border-white/30 rounded-lg" />
                              </button>
                              <div className="flex flex-col items-center space-y-2">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md" />
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md" />
                              </div>
                            </div>
                            {/* Meja 2 */}
                            <div className="flex items-center space-x-2 mb-2">
                              <div className="w-8 h-20 bg-amber-600 rounded-t-lg shadow-md" />
                              <button
                                onClick={() => fetchTableOrders("2")}
                                className={`w-12 h-20 ${getTableColor(2)} rounded-lg transform transition-all 
                                hover:scale-105 hover:shadow-lg relative group`}
                              >
                                <p className="font-bold text-white text-center pt-2">2</p>
                                <div className="absolute inset-0 border-2 border-white/30 rounded-lg" />
                              </button>
                              <div className="flex flex-col items-center space-y-2">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md" />
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md" />
                              </div>
                            </div>
                            {/* Meja 3 */}
                            <div className="flex items-center space-x-2 mb-2">
                              <div className="w-8 h-20 bg-amber-600 rounded-t-lg shadow-md" />
                              <button
                                onClick={() => fetchTableOrders("3")}
                                className={`w-12 h-20 ${getTableColor(3)} rounded-lg transform transition-all 
                                hover:scale-105 hover:shadow-lg relative group`}
                              >
                                <p className="font-bold text-white text-center pt-2">3</p>
                                <div className="absolute inset-0 border-2 border-white/30 rounded-lg" />
                              </button>
                              <div className="flex flex-col items-center space-y-2">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md" />
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md" />
                              </div>
                            </div>
                          </div>

                          {/* Meja 4,5,6,7 */}
                          <div className="flex flex-col justify-center ml-12">
                            {/* Meja 4 */}
                            <div className="flex items-center space-x-2 mb-2">
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md mt-2" />
                              <button
                                onClick={() => fetchTableOrders("4")}
                                className={`w-12 h-12 ${getTableColor(4)} rounded-lg transform transition-all 
                                hover:scale-105 hover:shadow-lg relative group`}
                              >
                                <p className="font-bold text-white text-center pt-2">4</p>
                                <div className="absolute inset-0 border-2 border-white/30 rounded-lg" />
                              </button>
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md mt-2" />
                            </div>
                            {/* Meja 5 */}
                            <div className="flex items-center space-x-2 mb-2">
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md mt-2" />
                              <button
                                onClick={() => fetchTableOrders("5")}
                                className={`w-12 h-12 ${getTableColor(5)} rounded-lg transform transition-all 
                                hover:scale-105 hover:shadow-lg relative group`}
                              >
                                <p className="font-bold text-white text-center pt-2">5</p>
                                <div className="absolute inset-0 border-2 border-white/30 rounded-lg" />
                              </button>
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md mt-2" />
                            </div>
                            {/* Meja 6 */}
                            <div className="flex items-center space-x-2 mb-2">
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md mt-2" />
                              <button
                                onClick={() => fetchTableOrders("6")}
                                className={`w-12 h-12 ${getTableColor(6)} rounded-lg transform transition-all 
                                hover:scale-105 hover:shadow-lg relative group`}
                              >
                                <p className="font-bold text-white text-center pt-2">6</p>
                                <div className="absolute inset-0 border-2 border-white/30 rounded-lg" />
                              </button>
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md mt-2" />
                            </div>
                            {/* Meja 7 */}
                            <div className="flex items-center space-x-2 mb-2">
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md mt-2" />
                              <button
                                onClick={() => fetchTableOrders("7")}
                                className={`w-12 h-12 ${getTableColor(7)} rounded-lg transform transition-all 
                                hover:scale-105 hover:shadow-lg relative group`}
                              >
                                <p className="font-bold text-white text-center pt-2">7</p>
                                <div className="absolute inset-0 border-2 border-white/30 rounded-lg" />
                              </button>
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md mt-2" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section Bawah Kiri */}
                      <div className="flex flex-row mt-10 space-y-2">
                        <div className="flex flex-col gap-2 my-2">
                          <div className="grid grid-cols-6 gap-2 mb-2">
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md" />
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md" />
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md" />
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md" />
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md" />
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md" />
                          </div>

                          <div className="flex flex-row items-center">
                            <button onClick={() => fetchTableOrders("8")} className={`w-48 h-12 ${getTableColor(8)} rounded`}>
                              <p className="font-bold text-white text-left">8</p>
                            </button>
                            <button onClick={() => fetchTableOrders("9")} className={`w-48 h-12 ${getTableColor(9)} rounded`}>
                              <p className="font-bold text-white text-right">9</p>
                            </button>
                          </div>
                          <div className="flex flex-row items-center">
                            <div className="w-96 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Lantai 1 - Bagian Kanan */}
                    <div className="w-1/2 flex flex-col lg:items-end">
                      <div className="flex flex-row">
                        <div className="relative flex items-center justify-center bg-gradient-to-r from-gray-300 to-gray-100 px-44 py-2 rounded-lg shadow-lg transform transition duration-300 hover:scale-105">
                          <span className="text-2xl font-bold text-gray-700">Tangga</span>
                        </div>
                      </div>
                      <div className="flex flex-row mt-6 mb-2">
                        <div className="flex flex-col mx-2 gap-16">
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105"></div>
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105"></div>
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105"></div>
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105"></div>
                        </div>
                        <div className="flex flex-row">
                          <div className="flex flex-col items-center">
                            <button onClick={() => fetchTableOrders("10")} className={`w-10 h-40 ${getTableColor(10)} rounded-xl transform transition-all hover:scale-[1.02] hover:shadow-lg relative group`}>
                              <p className="font-bold text-white absolute top-2 left-1/2 transform -translate-x-1/2 text-center">10</p>
                              <div className="absolute inset-0 border-2 border-white/30 rounded-xl" />
                            </button>

                            <button onClick={() => fetchTableOrders("11")} className={`w-10 h-40 ${getTableColor(11)} rounded-xl transform transition-all hover:scale-[1.02] hover:shadow-lg relative group`}>
                              <p className="font-bold text-white absolute top-2 left-1/2 transform -translate-x-1/2 text-center">11</p>
                              <div className="absolute inset-0 border-2 border-white/30 rounded-xl" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="w-72 h-72 bg-gradient-to-b from-[#fff8f0] to-[#D9D9D9] border border-gray-300 rounded-xl shadow-2xl transform transition duration-300 hover:scale-105">
                            <div className="flex flex-col items-center justify-center h-full">
                              <span className="text-7xl mb-4">🍳</span>
                              <h1 className="text-4xl font-bold text-gray-800 text-center">Kitchen</h1>
                            </div>
                          </div>

                          <div className="flex flex-row">
                            <div className="flex flex-col">
                              <button
                                onClick={() => fetchTableOrders("12")}
                                className={`w-32 h-10 ${getTableColor(12)} rounded-xl transform transition-all
                        hover:scale-[1.02] hover:shadow-lg relative group`}
                              >
                                <p className="font-bold text-white text-center">12</p>
                                <div className="absolute inset-0 border-2 border-white/30 rounded-xl" />
                              </button>
                              <div className="flex flex-row gap-8 mt-4">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105"></div>
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105"></div>
                              </div>
                            </div>
                            <div className="w-40 h-80 bg-gradient-to-b from-[#EDE3D7] to-[#D9D9D9] border border-gray-300 rounded-xl shadow-2xl transform transition duration-300 hover:scale-105">
                              <div className="flex flex-col items-center justify-center h-full">
                                <span className="text-7xl mb-4">🍸</span>
                                <h1 className="text-4xl font-bold text-gray-800 text-center">Bar</h1>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="xs:w-[1300px] lg:w-full flex flex-row justify-between mt-12 px-40">
                    <div className="flex justify-center flex-grow">
                      <div className="relative flex items-center justify-center bg-gradient-to-b from-[#DBAA61] to-[#A17C5B] text-white font-bold text-xl px-16 py-6 rounded-lg shadow-xl border-4 border-[#8B4513]">
                        Pintu Cafe
                        {/* Handle Pintu */}
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-12 bg-[#8B4513] rounded-full"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center space-x-6">
                      <div className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-700 text-white font-bold rounded-full shadow-md transition transform duration-300 hover:scale-105">Non Smoking</div>
                      <div className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold rounded-full shadow-md transition transform duration-300 hover:scale-105">Full AC</div>
                    </div>
                  </div>
                  <hr className="bg-[#D9D9D9] border-0 dark:bg-gray-700 h-1 xs:w-[1300px] lg:mx-40" />
                  <div className="px-40 pb-8">
                    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-inner">
                      <h3 className="text-xl font-semibold mb-4 text-center text-[#555]">🎁 Keterangan</h3>
                      <div className="flex justify-center gap-12">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-green-800 rounded-md shadow-inner" />
                          <span className="text-[#666]">Tersedia</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-[#D02323] rounded-md shadow-inner" />
                          <span className="text-[#666]">Terisi</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-xl text-[#666]">
                  <>
                    <div className="flex">
                      <button
                        onClick={() => fetchTableOrders("18")}
                        className={`w-1/3 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(18)}`}
                      >
                        <p className="font-bold text-white">18</p>
                      </button>
                      <button
                        onClick={() => fetchTableOrders("19")}
                        className={`w-1/3 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(19)}`}
                      >
                        <p className="font-bold text-white">19</p>
                      </button>
                      <button
                        onClick={() => fetchTableOrders("20")}
                        className={`w-1/3 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(20)}`}
                      >
                        <p className="font-bold text-white">20</p>
                      </button>
                    </div>
                    <div className="xs:w-[1500px] lg:w-full flex flex-row">
                      <div className="w-1/2">
                        <div className="flex flex-row">
                          <button
                            onClick={() => fetchTableOrders("17")}
                            className={`w-12 h-64 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(17)}`}
                          >
                            <p className="font-bold text-white">17</p>
                          </button>
                          {/* LANTAI 2 SECTION 1 KIRI */}
                          <div className="flex flex-row mt-6 gap-24 ">
                            <div className="flex flex-col gap-8">
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 ml-16" />
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 ml-16" />
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 ml-16" />
                            </div>
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2" />
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2" />
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2" />
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2" />
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2" />
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2" />

                          </div>
                          {/* END LANTAI 2 SECTION 1 KIRI */}
                        </div>
                      </div>
                      <div className="w-1/2">
                        <div className="flex flex-row pl-20">
                          {/* LANTAI 2 SECTION 1 KANAN */}
                          <div className="flex flex-row mt-6 gap-24 mr-10">
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2" />
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2" />
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2" />
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2" />
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2" />
                            <div className="flex flex-col gap-8">
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 ml-8" />
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 ml-8" />
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 ml-8" />

                            </div>
                          </div>
                          {/* END LANTAI 2 SECTION 1 KANAN */}
                          <div className="flex flex-row">
                            <button
                              onClick={() => fetchTableOrders("21")}
                              className={`w-12 h-64 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(21)} ml-10`}
                            >
                              <p className="font-bold text-white">21</p>
                            </button> </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2 */}
                    <div className="flex flex-row xs:w-[1500px] lg:w-full -mt-10 px-40 border-b-2 border-neutral-400">
                      {/* SECTION 2 KIRI */}
                      <div className="w-1/3 flex flex-col ">
                        <div className="flex flex-row items-center justify-center">
                          <div className="flex flex-row gap-8 justify-center items-center">
                            <div className="flex flex-col">
                              <div className="text-center">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 ml-12" />
                              </div>
                              <div className="flex flex-row gap-2 my-2">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2"> </div>

                                <button
                                  onClick={() => fetchTableOrders("13")}
                                  className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(13)}`}>
                                  <p className="font-bold text-white">13</p>
                                </button>

                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 " />
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <div className="text-center">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 ml-12" />

                              </div>
                              <div className="flex flex-row gap-2 my-2">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 " />
                                <button
                                  onClick={() => fetchTableOrders("14")}
                                  className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(14)}`}>
                                  <p className="font-bold text-white">14</p>
                                </button>
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2  " />

                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* END SECTION 2 KIRI */}

                      {/* SECTION 2 TENGAH */}
                      <div className="w-1/3 flex flex-col  items-center text-center">
                      <div className="relative w-48 h-16  bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl border border-yellow-700 shadow-xl flex items-center justify-center transform transition duration-300 hover:scale-105 hover:rotate-2">
  <p className="text-white font-extrabold text-2xl drop-shadow-lg">OUTDOOR</p>
</div>
                        <div className="relative w-40 h-12 mt-5 bg-yellow-600 rounded-lg border-4 border-yellow-700 shadow-lg flex items-center justify-center text-white font-bold text-xl transition-transform duration-300 hover:scale-105 hover:shadow-2xl">
                          <p className="absolute bottom-4 text-yellow-900 font-semibold">Pintu</p>
                        </div>
                      </div>
                      {/* END SECTION 2 TENGAH */}

                      {/* SECTION 2 KANAN */}
                      <div className="w-1/3 flex flex-col ">
                        <div className="flex flex-row items-center justify-center">
                          <div className="flex flex-row gap-8 justify-center items-center">
                            <div className="flex flex-col">
                              <div className="text-center">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 ml-12" />
                              </div>
                              <div className="flex flex-row gap-2 my-2">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2" />
                                <button
                                  onClick={() => fetchTableOrders("15")}
                                  className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(15)}`}>
                                  <p className="font-bold text-white">15</p>
                                </button>
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2" />
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <div className="text-center">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 ml-12" />
                              </div>
                              <div className="flex flex-row gap-2 my-2">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2" />
                                <button
                                  onClick={() => fetchTableOrders("16")}
                                  className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(16)}`}>
                                  <p className="font-bold text-white">16</p>
                                </button>
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2" />

                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* END SECTION 2 KANAN */}
                    </div>
                    {/* END SECTION 2 */}

                    {/* SECTION 3 */}
                    <div className="flex flex-row xs:w-[1500px] lg:w-full w-full pl-32 border-neutral-400">
                      {/* SECTION 3 KIRI */}
                      <div className="w-1/3 flex flex-col ">
                        <div className="flex flex-row items-center justify-center my-8">
                          <div className="flex flex-row justify-center items-center">
                            <div className="flex flex-col mr-96">
                              <div className="text-center">
                                <div className="w-60 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 ml-12" />
                              </div>
                              <div className="flex flex-row gap-2 my-2">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2" />

                                <button
                                  onClick={() => fetchTableOrders("35")}
                                  className={`w-60 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(35)}`}>
                                  <p className="font-bold text-white">35</p>
                                </button>
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2" />

                              </div>
                              <div className="text-center">
                                <div className="w-60 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 ml-12" />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-row items-center justify-center">
                          <div className="flex flex-col gap-8 mt-8">
                            <div className="flex flex-row justify-center items-center">


                            </div>
                            <div className="flex flex-row justify-center items-center">

                              <div className="flex flex-col mx-20">
                                <div className="text-center">
                                  <div className="w-12 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 ml-12 mb-2" />
                                </div>
                                <div className="flex flex-row gap-2">
                                  <div className="flex flex-col items-center">
                                    <div className="w-10 h-32 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-8"></div>
                                    <div className="w-10 h-32 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-16"></div>
                                  </div>

                                  <div className="flex flex-col items-center">
                                    <button
                                      onClick={() => fetchTableOrders("32")}
                                      className={`w-12 h-48 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(32)}`}>
                                      <p className="font-bold text-white">32</p>
                                    </button>
                                    <button
                                      onClick={() => fetchTableOrders("31")}
                                      className={`w-12 h-48 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(31)}`}>
                                      <p className="font-bold text-white">31</p>
                                    </button>
                                    <div className="w-12 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2  mb-2" />

                                  </div>
                                  <div className="flex flex-col items-center">
                                    <div className="w-12 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-8  mb-2" />
                                    <div className="w-12 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-8  mb-2" />
                                    <div className="w-12 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-8  mb-2" />
                                    <div className="w-12 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-8  mb-2" />
                                    <div className="w-12 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-8  mb-2" />
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col space-y-8 mb-64">
                                {/* Div pertama */}
                                <div className="flex flex-col mx-20 mb-24">
                                  <div className="text-center">
                                    <div className="flex">
                                      <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-8 mb-2 ml-12" />
                                      <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-8 mb-2 ml-1" />
                                    </div>
                                  </div>
                                  <div className="flex flex-row gap-2">
                                    <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 mb-2" />

                                    <div className="flex flex-col items-center">
                                      <button
                                        onClick={() => fetchTableOrders("34")}
                                        className="flex items-center justify-center"
                                      >
                                        <div className={`${getTableColor(34)} w-12 h-12 rounded-full flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 hover:shadow-lg`}>
                                          <p className="font-bold text-white">3</p>
                                        </div>
                                        <div className={`${getTableColor(34)} w-12 h-12 rounded-full flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 hover:shadow-lg -ml-3`}>
                                          <p className="font-bold text-white">4</p>
                                        </div>
                                      </button>
                                      <div className="flex">
                                        <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-1 mb-2" />
                                        <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-1 mb-2 ml-1" />
                                      </div>
                                    </div>

                                    <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 mb-2" />
                                  </div>
                                </div>

                                {/* Div kedua */}
                                <div className="flex flex-col mx-20 mt-24">
                                  <div className="text-center">
                                    <div className="flex">
                                      <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-8 mb-2 ml-12" />
                                      <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-8 mb-2 ml-1" />
                                    </div>
                                  </div>
                                  <div className="flex flex-row gap-2">
                                    <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 mb-2" />

                                    <div className="flex flex-col items-center">

                                      <button
                                        onClick={() => fetchTableOrders("33")}
                                        className="flex items-center justify-center"
                                      >
                                        <div className={`${getTableColor(33)} w-12 h-12 rounded-full flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 hover:shadow-lg`}>
                                          <p className="font-bold text-white">3</p>
                                        </div>
                                        <div className={`${getTableColor(33)} w-12 h-12 rounded-full flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 hover:shadow-lg -ml-3`}>
                                          <p className="font-bold text-white">3</p>
                                        </div>
                                      </button>



                                      <div className="flex">
                                        <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-1 mb-2" />
                                        <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-1 mb-2 ml-1" />
                                      </div>
                                    </div>
                                    <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 mb-2" />
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-row justify-center items-center ml-64">
                            </div>
                            <div className="flex flex-row justify-center items-center">
                              <div className="flex flex-col mx-20 gap-2">
                                <div className="text-center">
                                  <div className="w-12 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 ml-24" />
                                </div>
                                <div className="flex flex-row gap-2">
                                  <div className="w-10 h-42 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 ml-12" />
                                  <button
                                    onClick={() => fetchTableOrders("30")}
                                    className={`w-12 h-64 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(30)}`}>
                                    <p className="font-bold text-white">30</p>
                                  </button>
                                  <div className="w-8 h-42 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 ml-1" />

                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* END SECTION 3 KIRI */}
                      {/* SECTION 3 TENGAH */}
                      <div className="w-1/3 flex flex-col gap-y-20 items-end text-center">
                        <div className="flex flex-col items-end">
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 mb-2 mr-1 " />
                          <div className="flex flex-row">
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-3 mr-1 " />
                            <button
                              onClick={() => fetchTableOrders("26")}
                              className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(26)}`}>
                              <p className="font-bold text-white">26</p>
                            </button>
                          </div>
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 mr-1 " />
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 mb-1 mr-1 " />
                          <div className="flex flex-row">
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 mr-1 " />
                            <button
                              onClick={() => fetchTableOrders("27")}
                              className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(27)}`}>
                              <p className="font-bold text-white">27</p>
                            </button>
                          </div>
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 mr-1 " />

                        </div>
                        <div className="flex flex-col items-end">
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 mb-1 mr-1 " />

                          <div className="flex flex-row">
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 mr-1 " />

                            <button
                              onClick={() => fetchTableOrders("28")}
                              className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(28)}`}>
                              <p className="font-bold text-white">28</p>
                            </button>
                          </div>
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 mr-1 " />

                        </div>
                        <div className="flex flex-col items-end">
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2 mb-1 mr-1 " />

                          <div className="flex flex-row">
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2  mr-1 " />

                            <button
                              onClick={() => fetchTableOrders("29")}
                              className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(29)}`}>
                              <p className="font-bold text-white">29</p>
                            </button>
                          </div>
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-2  mr-1 " />

                        </div>
                      </div>
                      {/* END SECTION 3 TENGAH */}

                      {/* SECTION 3 KANAN */}
                      <div className="w-1/3 flex flex-col border-l-2 border-neutral-400">
                        <div className="flex flex-row justify-center">
                          <div className="flex flex-col items-center">
                            {/* Layar TV */}
                            <div className="relative bg-black rounded-xl shadow-lg w-48 h-24 overflow-hidden">
                              <div className="absolute inset-0 bg-gray-800 rounded-xl flex items-center justify-center">
                                <span className="text-white text-2xl font-bold">Screen</span>
                              </div>
                            </div>
                            {/* Stand TV */}
                            <div className="mt-2 bg-gray-700 w-20 h-2 rounded-md"></div>
                          </div>

                        </div>
                        <div className="flex flex-row justify-end">
                          <div className="flex flex-col mt-20">
                            <div className="relative flex items-center justify-center p-6 bg-gradient-to-br from-[#F5E9D3] to-[#D4B483] border-2 border-[#A17C5B] rounded-lg shadow-2xl transform transition duration-300 hover:scale-105 w-60 h-12">
                              <span className="text-xl font-bold text-[#2A2A2A]">MEETING ROOM</span>
                            </div>

                            <div className="flex flex-row gap-4 mr-24 mt-20 items-center">
                              <div className="flex flex-col gap-2 my-1">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105  mr-1 " />
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-4  mr-1 " />
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-4  mr-1 " />
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-4  mr-1 " />
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-4  mr-1 " />
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-4  mr-1 " />

                              </div>
                              <div className="flex flex-row items-center">
                                <button
                                  onClick={() => fetchTableOrders("22")}
                                  className={`w-28 h-80 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(22)}`}
                                >
                                  <p className="font-bold text-white">22</p>
                                </button>
                              </div>
                              <div className="flex flex-col gap-2 my-1">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105  mr-1 " />
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-4  mr-1 " />
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-4  mr-1 " />
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-4  mr-1 " />
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-4  mr-1 " />
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-4  mr-1 " />
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-row">
                            <div className="flex flex-col gap-12 my-2 mx-3">
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-4  mr-1 " />
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-3  mr-1 " />
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-3  mr-1 " />
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-3  mr-1 " />
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-3  mr-1 " />
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-3  mr-1 " />
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-3  mr-1 " />
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md  transform transition-all hover:scale-105 mt-3  mr-1 " />

                            </div>
                            <div className="flex flex-col">
                              <div className="flex gap-4">
                                <div className="flex flex-col">
                                  <button
                                    onClick={() => fetchTableOrders("23")}
                                    className={`w-8 h-60 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(23)}`}
                                  >
                                    <p className="font-bold text-white">23</p>
                                  </button>
                                  <button
                                    onClick={() => fetchTableOrders("24")}
                                    className={`w-8 h-60 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(24)}`}
                                  >
                                    <p className="font-bold text-white">24</p>
                                  </button>
                                  <button
                                    onClick={() => fetchTableOrders("25")}
                                    className={`w-8 h-60 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(25)}`}
                                  >
                                    <p className="font-bold text-white">25</p>
                                  </button>
                                </div>
                              </div>

                            </div>
                          </div>
                        </div>
                      </div>
                      {/* END SECTION 3 KANAN */}
                    </div>
                    {/* END SECTION 3 */}

                    <div className="flex flex-row xs:w-[1500px] lg:w-full justify-between mt-12 mb-4 px-40">
                      <div className="flex justify-center flex-grow">
                        <div className="flex flex-row gap-12">
                          <div className="relative flex items-center justify-center bg-gradient-to-r from-gray-300 to-gray-100 px-44 py-2 rounded-lg shadow-lg transform transition duration-300 hover:scale-105">
                            <span className="text-2xl font-bold text-gray-700">Tangga</span>
                          </div>

                          <div className="relative flex items-center justify-center bg-gradient-to-r from-gray-300 to-gray-100 px-44 py-2 rounded-lg shadow-lg transform transition duration-300 hover:scale-105">
                            <span className="text-2xl font-bold text-gray-700">Tangga</span>
                          </div>
                        </div>

                      </div>
                      <div className="flex items-center">
                        <div className="flex items-center justify-center space-x-6">
                          <div className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-700 text-white font-bold rounded-full shadow-md transition transform duration-300 hover:scale-105">
                            Non Smoking
                          </div>
                          <div className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold rounded-full shadow-md transition transform duration-300 hover:scale-105">
                            Full AC
                          </div>
                        </div>

                      </div>
                    </div>
                    <hr className=" bg-[#D9D9D9] border-0 dark:bg-gray-700 h-1 xs:w-[1300px] lg:w-full lg:mx-40"></hr>

                    <div className="px-40 pb-8">
                      <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-inner">
                        <h3 className="text-xl font-semibold mb-4 text-center text-[#555]">
                          🎁 Keterangan
                        </h3>
                        <div className="flex justify-center gap-12">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-800 rounded-md shadow-inner" />
                            <span className="text-[#666]">Tersedia</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-[#D02323] rounded-md shadow-inner" />
                            <span className="text-[#666]">Terisi</span>
                          </div>
                        </div>
                      </div>
                    </div>

                 

                  </>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Popup Completed Orders */}
        {isPopupVisible && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
      <div className="bg-[#FFF5E6] p-6 border-b">
        <h2 className="text-2xl font-bold text-[#2A2A2A] flex items-center gap-2">
          📋 Daftar Pesanan - Meja {selectedTableNumber}
          <span className="text-lg font-normal text-[#666]">
            ({selectedTableOrders.length} aktif, {selectedCompletedOrders.length} selesai)
          </span>
        </h2>
      </div>

      <div className="p-6 space-y-8">
        {/* Active Orders Section */}
        {selectedTableOrders.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold mb-4 text-[#FF8A00] border-b-2 border-[#FF8A00] pb-2">Pesanan Aktif</h3>
            {selectedTableOrders.map((order) => (
              <OrderCard key={order.id} order={order} onComplete={() => markOrderAsCompleted(order.id)} />
            ))}
          </div>
        )}

        {/* Completed Orders Section */}
        {selectedCompletedOrders.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold mb-4 text-[#00C851] border-b-2 border-[#00C851] pb-2">Pesanan Selesai</h3>
            {selectedCompletedOrders.map((order) => (
              <OrderCard key={order.id} order={order} isCompleted />
            ))}
          </div>
        )}

        {/* Empty State */}
        {selectedTableOrders.length === 0 && selectedCompletedOrders.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Belum ada pesanan untuk meja ini</p>
            <div className="flex justify-center gap-4">
              <Link 
                href={`/menu?table=${selectedTableNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#FF8A00] text-white px-4 py-2 rounded-lg hover:bg-[#FF6A00] transition-colors"
              >
                Pesan Sekarang
              </Link>
              {manuallyMarkedTables.includes(selectedTableNumber) ? (
                <button
                  onClick={() => resetTable(selectedTableNumber)}
                  className="bg-green-800 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Reset Meja
                </button>
              ) : (
                <button
                  onClick={() => markTableAsOccupied(selectedTableNumber)}
                  className="bg-[#D02323] text-white px-4 py-2 rounded-lg hover:bg-[#B21E1E] transition-colors"
                >
                  Tandai sebagai Terisi
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t">
        <button
          onClick={() => {
            setIsPopupVisible(false);
            fetchData(); // Refetch data terbaru saat menutup popup
          }}
          className="w-full bg-[#FF8A00] hover:bg-[#FF6A00] text-white py-2 px-4 rounded-lg transition"
        >
          Tutup
        </button>
      </div>
    </div>
  </div>
)}
      </div>{" "}
    </div>
  );
};

export default Bookinge;
