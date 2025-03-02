"use client";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Inter } from "next/font/google";
import { useRouter } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

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

interface ReservationData {
  namaCustomer: string;
  nomorKontak: string;
  selectedDateTime: string;
  durasiJam: number;
  durasiMenit: number;
  kodeBooking: string;
  meja?: string;
}

const Booking1 = () => {
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [selectedTableOrders, setSelectedTableOrders] = useState<Order[]>([]);
  const [selectedCompletedOrders, setSelectedCompletedOrders] = useState<Order[]>([]);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [selectedTableNumber, setSelectedTableNumber] = useState<string>("");
  const router = useRouter();
  const [, setManuallyMarkedTables] = useState<string[]>([]);
  const [backendMarkedTables, setBackendMarkedTables] = useState<string[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);

  // Fetch data reservasi
  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const response = await fetch("/api/reservasi");
        if (!response.ok) throw new Error("Gagal mengambil data reservasi");
        const reservationsData = await response.json();
        setReservations(reservationsData);
      } catch (error) {
        console.error("Error fetching reservations:", error);
      }
    };
    fetchReservations();
  }, []);

  // Fungsi untuk menentukan kapasitas meja
  const getCapacityMessage = (tableNumber: string) => {
    const num = parseInt(tableNumber, 10);
    if (isNaN(num)) return "";
    if (num >= 1 && num <= 3) return "Dapat digunakan untuk 3-5 orang";
    if (num >= 4 && num <= 7) return "Dapat digunakan untuk 1-2 orang";
    if (num >= 8 && num <= 9) return "Dapat digunakan untuk 4-6 orang";
    if (num >= 10 && num <= 12) return "Dapat digunakan untuk 1-2 orang";
    if (num >= 13 && num <= 16) return "Dapat digunakan untuk 1-3 orang";
    if (num >= 17 && num <= 21) return "Dapat digunakan untuk 2-3 orang";
    if (num === 22) return "Dapat digunakan sebagai ruangan meeting untuk 8-12 orang";
    if (num >= 23 && num <= 25) return "Dapat digunakan sebagai ruangan meeting untuk 2-4 orang";
    if (num >= 26 && num <= 29) return "Dapat digunakan untuk 2-3 orang";
    if (num >= 30 && num <= 35) return "Dapat digunakan untuk 4-6 orang";
    return "";
  };

  // Fetch data awal dan refresh berkala
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const savedMarkedTables = localStorage.getItem("manuallyMarkedTables");
    if (savedMarkedTables) {
      setManuallyMarkedTables(JSON.parse(savedMarkedTables));
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "manuallyMarkedTables") {
        setManuallyMarkedTables(e.newValue ? JSON.parse(e.newValue) : []);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const fetchData = async () => {
    try {
      const [mejaRes, ordersRes, reservasiRes] = await Promise.all([
        fetch("/api/nomeja"),
        fetch("/api/orders"),
        fetch("/api/reservasi"),
      ]);

      if (!mejaRes.ok) throw new Error("Gagal mengambil data meja");
      if (!ordersRes.ok) throw new Error("Gagal mengambil data pesanan");
      if (!reservasiRes.ok) throw new Error("Gagal mengambil data reservasi");

      const mejaData = await mejaRes.json();
      const ordersData = await ordersRes.json();
      const reservasiData = await reservasiRes.json();

      setBackendMarkedTables(mejaData.map((meja: { nomorMeja: number }) => meja.nomorMeja.toString()));
      setAllOrders(ordersData.orders);
      setReservations(reservasiData);
    } catch (error) {
      console.error("Terjadi kesalahan:", error);
    }
  };

  // Menentukan warna meja berdasarkan status
  const getTableColor = (nomorMeja: number) => {
    const tableNumberStr = nomorMeja.toString();
  
    // Cek apakah ada pesanan aktif atau reservasi di meja ini
    const hasActiveOrders = allOrders.some(
      (order) => order.tableNumber === tableNumberStr
    );
  
    const hasActiveReservation = reservations.some(
      (reservasi) => 
        reservasi.nomorMeja === tableNumberStr && 
        (reservasi.status === "BOOKED" || reservasi.status === "OCCUPIED")
    );
  
    // Warna merah jika ada pesanan aktif atau reservasi aktif
    if (hasActiveOrders || hasActiveReservation) {
      return "bg-[#D02323]";
    }
  
    // Warna hijau jika tidak ada pesanan dan tidak ada reservasi
    return "bg-green-800";
  };

  // Fetch detail pesanan meja yang dipilih
  const fetchTableOrders = async (tableNumber: string) => {
    try {
      setSelectedTableNumber(tableNumber);
      setIsPopupVisible(true);
      setSelectedTableOrders([]);
      setSelectedCompletedOrders([]);

      const response = await fetch(`/api/orders?tableNumber=${tableNumber}`);
      if (!response.ok) throw new Error("Gagal mengambil data pesanan");

      const data = await response.json();
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

  // Handler untuk memilih meja dan redirect ke menu
  const handleSelectTable = (tableNumber: string) => {
    const reservationData: ReservationData = JSON.parse(sessionStorage.getItem("reservationData") || "{}");
    if (getTableColor(Number(tableNumber)) === "bg-green-800") {
      // Update nomor meja di reservationData
      reservationData.meja = tableNumber;
      sessionStorage.setItem("reservationData", JSON.stringify(reservationData));
      router.push(`/menu?table=${tableNumber}&reservation=true&bookingCode=${reservationData.kodeBooking}`);
      setIsPopupVisible(false);
    } else {
      toast.error("Meja ini sudah terisi atau dipesan.");
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen min-w-[1400px]">
      <div className={`flex h-screen ${inter.className} min-w-[1400px]`}>
        {/* Main Content */}
        <div className={`flex-1 p-8 transition-all duration-300`}>
          <div className="w-full sm:px-6 lg:px-28 pt-16">
            <h2 className="text-4xl font-bold mb-8 text-[#2A2A2A] drop-shadow-sm">🪑 Pilih Meja Anda</h2>

            {/* Floor Selection */}
            <div className="mb-8 flex gap-6 border-b-2 border-[#FFEED9] pb-4">
              {[1, 2].map((floor) => (
                <label
                  key={floor}
                  className={`flex items-center space-x-2 px-5 py-2 rounded-full transition-all ${
                    selectedFloor === floor ? "bg-[#FF8A00] text-white shadow-md" : "bg-[#FFEED9] text-[#666] hover:bg-[#FFE4C4]"
                  } cursor-pointer`}
                >
                  <input
                    type="radio"
                    name="floor"
                    value={floor}
                    checked={selectedFloor === floor}
                    onChange={() => setSelectedFloor(floor)}
                    className="hidden"
                  />
                  <span>Lantai {floor}</span>
                </label>
              ))}
            </div>

            {/* Floor Layout */}
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
                                className={`w-12 h-20 ${getTableColor(1)} rounded-lg transform transition-all hover:scale-105 hover:shadow-lg relative group`}
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
                                className={`w-12 h-20 ${getTableColor(2)} rounded-lg transform transition-all hover:scale-105 hover:shadow-lg relative group`}
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
                                className={`w-12 h-20 ${getTableColor(3)} rounded-lg transform transition-all hover:scale-105 hover:shadow-lg relative group`}
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
                                className={`w-12 h-12 ${getTableColor(4)} rounded-lg transform transition-all hover:scale-105 hover:shadow-lg relative group`}
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
                                className={`w-12 h-12 ${getTableColor(5)} rounded-lg transform transition-all hover:scale-105 hover:shadow-lg relative group`}
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
                                className={`w-12 h-12 ${getTableColor(6)} rounded-lg transform transition-all hover:scale-105 hover:shadow-lg relative group`}
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
                                className={`w-12 h-12 ${getTableColor(7)} rounded-lg transform transition-all hover:scale-105 hover:shadow-lg relative group`}
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
                        <div className="flex flex-col gap-2 my-2 mt-24">
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
                            <div className="w-96 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2"></div>
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
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105"></div>
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105"></div>
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105"></div>
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105"></div>
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
                              <h1 className="text-4xl font-bold text-gray-800 text-center">Kitchen</h1>
                            </div>
                          </div>
                          <div className="flex flex-row">
                            <div className="flex flex-col">
                              <button
                                onClick={() => fetchTableOrders("12")}
                                className={`w-32 h-10 ${getTableColor(12)} rounded-xl transform transition-all hover:scale-[1.02] hover:shadow-lg relative group`}
                              >
                                <p className="font-bold text-white text-center">12</p>
                                <div className="absolute inset-0 border-2 border-white/30 rounded-xl" />
                              </button>
                              <div className="flex flex-row gap-8 mt-4">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105"></div>
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105"></div>
                              </div>
                            </div>
                            <div className="w-40 h-80 bg-gradient-to-b from-[#EDE3D7] to-[#D9D9D9] border border-gray-300 rounded-xl shadow-2xl transform transition duration-300 hover:scale-105">
                              <div className="flex flex-col items-center justify-center h-full">
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
                      <div className="relative flex items-center justify-center bg-gradient-to-b from-[#DBAA61] to-[#A17C5B] text-white font-bold text-xl px-16 py-6 rounded-lg shadow-xl border-4 border-[#8B4513] ml-56">
                        Pintu Cafe
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
                        className={`w-1/6 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(18)}`}
                      >
                        <p className="font-bold text-white">18</p>
                      </button>
                      <button
                        onClick={() => fetchTableOrders("19")}
                        className={`w-1/6 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(19)}`}
                      >
                        <p className="font-bold text-white">19</p>
                      </button>
                      <button
                        onClick={() => fetchTableOrders("20")}
                        className={`w-1/6 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(20)}`}
                      >
                        <p className="font-bold text-white">20</p>
                      </button>
                      <button
                        onClick={() => fetchTableOrders("21")}
                        className={`w-1/6 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(21)}`}
                      >
                        <p className="font-bold text-white">21</p>
                      </button>
                      <button
                        onClick={() => fetchTableOrders("22")}
                        className={`w-1/6 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(22)}`}
                      >
                        <p className="font-bold text-white">22</p>
                      </button>
                      <button
                        onClick={() => fetchTableOrders("23")}
                        className={`w-1/6 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(23)}`}
                      >
                        <p className="font-bold text-white">23</p>
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
                          <div className="flex flex-row mt-6 gap-24">
                            <div className="flex flex-col gap-8">
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 ml-16" />
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 ml-16" />
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 ml-16" />
                            </div>
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2" />
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2" />
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2" />
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2" />
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2" />
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2" />
                          </div>
                        </div>
                      </div>
                      <div className="w-1/2">
                        <div className="flex flex-row pl-20">
                          <div className="flex flex-row mt-6 gap-24 mr-10">
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2" />
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2" />
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2" />
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2" />
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2" />
                            <div className="flex flex-col gap-8">
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 ml-8" />
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 ml-8" />
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 ml-8" />
                            </div>
                          </div>
                          <div className="flex flex-row">
                            <button
                              onClick={() => fetchTableOrders("24")}
                              className={`w-12 h-64 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(24)} ml-10`}
                            >
                              <p className="font-bold text-white">24</p>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* SECTION 2 */}
                    <div className="flex flex-row xs:w-[1500px] lg:w-full -mt-10 px-40 border-b-2 border-neutral-400">
                      <div className="w-1/3 flex flex-col">
                        <div className="flex flex-row items-center justify-center">
                          <div className="flex flex-row gap-8 justify-center items-center">
                            <div className="flex flex-col">
                              <div className="text-center">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-12 ml-12" />
                              </div>
                              <div className="flex flex-row gap-2 my-2">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2" />
                                <button
                                  onClick={() => fetchTableOrders("13")}
                                  className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(13)}`}
                                >
                                  <p className="font-bold text-white">13</p>
                                </button>
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2" />
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <div className="text-center">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-12 ml-12" />
                              </div>
                              <div className="flex flex-row gap-2 my-2">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2" />
                                <button
                                  onClick={() => fetchTableOrders("14")}
                                  className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(14)}`}
                                >
                                  <p className="font-bold text-white">14</p>
                                </button>
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="w-1/3 flex flex-col items-center text-center">
                        <div className="relative w-48 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl border border-yellow-700 shadow-xl flex items-center justify-center transform transition duration-300 hover:scale-105 hover:rotate-2">
                          <p className="text-white font-extrabold text-2xl drop-shadow-lg">OUTDOOR (ROOFTOP)</p>
                        </div>
                        <div className="relative w-40 h-12 mt-3 bg-yellow-600 rounded-lg border-4 border-yellow-700 shadow-lg flex items-center justify-center text-white font-bold text-xl transition-transform duration-300 hover:scale-105 hover:shadow-2xl">
                          <p className="absolute bottom-4 text-yellow-900 font-semibold">Pintu</p>
                        </div>
                      </div>
                      <div className="w-1/3 flex flex-col">
                        <div className="flex flex-row items-center justify-center">
                          <div className="flex flex-row gap-8 justify-center items-center">
                            <div className="flex flex-col">
                              <div className="text-center">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-12 ml-12" />
                              </div>
                              <div className="flex flex-row gap-2 my-2">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2" />
                                <button
                                  onClick={() => fetchTableOrders("15")}
                                  className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(15)}`}
                                >
                                  <p className="font-bold text-white">15</p>
                                </button>
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2" />
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <div className="text-center">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-12 ml-12" />
                              </div>
                              <div className="flex flex-row gap-2 my-2">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2" />
                                <button
                                  onClick={() => fetchTableOrders("16")}
                                  className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(16)}`}
                                >
                                  <p className="font-bold text-white">16</p>
                                </button>
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* SECTION 3 */}
                    <div className="flex flex-row xs:w-[1500px] lg:w-full w-full pl-32 border-neutral-400">
                      <div className="w-1/3 flex flex-col">
                        <div className="flex flex-row items-center justify-center my-8">
                          <div className="flex flex-row justify-center items-center">
                            <div className="flex flex-col mr-36">
                              <div className="text-center">
                                <div className="w-60 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 ml-12" />
                              </div>
                              <div className="flex flex-row gap-2 my-2 mr-16">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2" />
                                <button
                                  onClick={() => fetchTableOrders("36")}
                                  className={`w-60 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(36)}`}
                                >
                                  <p className="font-bold text-white">36</p>
                                </button>
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2" />
                              </div>
                              <div className="text-center">
                                <div className="w-60 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 ml-12" />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-row items-center justify-center">
                          <div className="flex flex-col gap-8">
                            <div className="flex flex-row justify-center items-center"></div>
                            <div className="flex flex-row justify-center items-center">
                              <div className="flex flex-col mx-20">
                                <div className="text-center">
                                  <div className="w-12 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 ml-12 mb-2" />
                                </div>
                                <div className="flex flex-row gap-2 mr-24">
                                  <div className="flex flex-col items-center">
                                    <div className="w-10 h-32 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-8"></div>
                                    <div className="w-10 h-32 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-16"></div>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <button
                                      onClick={() => fetchTableOrders("32")}
                                      className={`w-12 h-48 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(32)}`}
                                    >
                                      <p className="font-bold text-white">32</p>
                                    </button>
                                    <button
                                      onClick={() => fetchTableOrders("31")}
                                      className={`w-12 h-48 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(31)}`}
                                    >
                                      <p className="font-bold text-white">31</p>
                                    </button>
                                    <div className="w-12 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 mb-2" />
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <div className="w-12 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-8 mb-2" />
                                    <div className="w-12 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-8 mb-2" />
                                    <div className="w-12 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-8 mb-2" />
                                    <div className="w-12 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-8 mb-2" />
                                    <div className="w-12 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-8 mb-2" />
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col space-y-8 mb-16">
                                <div className="flex flex-col space-y-10">
                                  {/* Div pertama */}
                                  <div className="flex flex-col mx-20">
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
                                          onClick={() => fetchTableOrders("35")}
                                          className="flex items-center justify-center"
                                        >
                                          <div className={`${getTableColor(35)} w-12 h-12 rounded-full flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 hover:shadow-lg`}>
                                            <p className="font-bold text-white">3</p>
                                          </div>
                                          <div className={`${getTableColor(35)} w-12 h-12 rounded-full flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 hover:shadow-lg -ml-3`}>
                                            <p className="font-bold text-white">5</p>
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
                                  <div className="flex flex-col mx-20">
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
                                  {/* Div ketiga */}
                                  <div className="flex flex-col mx-20">
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
                            </div>
                            <div className="flex flex-row justify-center items-center ml-64"></div>
                            <div className="flex flex-row justify-center items-center">
                              <div className="flex flex-col mx-20 gap-2 mb-12">
                                <div className="text-center">
                                  <div className="w-12 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-0 ml-24" />
                                </div>
                                <div className="flex flex-row gap-2 mr-96">
                                  <div className="w-10 h-42 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 ml-12" />
                                  <button
                                    onClick={() => fetchTableOrders("30")}
                                    className={`w-12 h-64 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(30)}`}
                                  >
                                    <p className="font-bold text-white">30</p>
                                  </button>
                                  <div className="w-8 h-42 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 ml-1" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="w-1/3 flex flex-col gap-y-20 items-end text-center">
                        <h1 className="text-xl md:text-5xl font-extrabold text-black tracking-wide drop-shadow-lg hover:scale-105 transform transition duration-300 text-center mt-4 mr-80 text-center">
                          Lantai 2
                        </h1>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center w-full space-x-6 mr-36">
                            <div className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-700 text-white font-bold rounded-full shadow-md transition transform duration-300 hover:scale-105">
                              Smoking
                            </div>
                            <div className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold rounded-full shadow-md transition transform duration-300 hover:scale-105">
                              NO AC
                            </div>
                          </div>
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 mb-2 mr-1" />
                          <div className="flex flex-row">
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-3 mr-1" />
                            <button
                              onClick={() => fetchTableOrders("26")}
                              className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(26)}`}
                            >
                              <p className="font-bold text-white">26</p>
                            </button>
                          </div>
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 mr-1" />
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 mb-1 mr-1" />
                          <div className="flex flex-row">
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 mr-1" />
                            <button
                              onClick={() => fetchTableOrders("27")}
                              className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(27)}`}
                            >
                              <p className="font-bold text-white">27</p>
                            </button>
                          </div>
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 mr-1" />
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 mb-1 mr-1" />
                          <div className="flex flex-row">
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 mr-1" />
                            <button
                              onClick={() => fetchTableOrders("28")}
                              className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(28)}`}
                            >
                              <p className="font-bold text-white">28</p>
                            </button>
                          </div>
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 mr-1" />
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 mb-1 mr-1" />
                          <div className="flex flex-row">
                            <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 mr-1" />
                            <button
                              onClick={() => fetchTableOrders("29")}
                              className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(29)}`}
                            >
                              <p className="font-bold text-white">29</p>
                            </button>
                          </div>
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 mr-1" />
                        </div>
                      </div>
                      <div className="w-1/3 h-full flex flex-col border-l-2 border-neutral-400">
                        <div className="flex flex-row justify-center">
                          <div className="flex flex-col items-center">
                            <div className="relative bg-black rounded-xl shadow-lg w-48 h-24 overflow-hidden">
                              <div className="absolute inset-0 bg-gray-800 rounded-xl flex items-center justify-center">
                                <span className="text-white text-2xl font-bold">Screen</span>
                              </div>
                            </div>
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
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mr-1" />
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-4 mr-1" />
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-4 mr-1" />
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-4 mr-1" />
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-4 mr-1" />
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-4 mr-1" />
                              </div>
                              <div className="flex flex-row items-center">
                                <button
                                  onClick={() => fetchTableOrders("25")}
                                  className={`w-28 h-80 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(25)}`}
                                >
                                  <p className="font-bold text-white">25</p>
                                </button>
                              </div>
                              <div className="flex flex-col gap-2 my-1">
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mr-1" />
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-4 mr-1" />
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-4 mr-1" />
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-4 mr-1" />
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-4 mr-1" />
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-4 mr-1" />
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-row">
                            <div className="flex flex-col gap-12 my-2 mx-3">
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-4 mr-1" />
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-3 mr-1" />
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-3 mr-1" />
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-3 mr-1" />
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-3 mr-1" />
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-3 mr-1" />
                              <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-3 mr-1" />
                            </div>
                            <div className="flex flex-col">
                              <div className="flex gap-4">
                                <div className="flex flex-col">
                                  <button
                                    onClick={() => fetchTableOrders("25")}
                                    className={`w-8 h-80 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(25)}`}
                                  >
                                    <p className="font-bold text-white">25</p>
                                  </button>
                                  <button
                                    onClick={() => fetchTableOrders("25")}
                                    className={`w-8 h-80 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(25)}`}
                                  >
                                    <p className="font-bold text-white">25</p>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-center space-x-6 ml-24 mt-48">
                          <div className="relative w-40 h-12 mt-3 bg-yellow-600 rounded-lg border-4 border-yellow-700 shadow-lg flex items-center justify-center text-white font-bold text-xl transition-transform duration-300 hover:scale-105 hover:shadow-2xl">
                            <p className="absolute bottom-4 text-yellow-900 font-semibold">Pintu</p>
                          </div>
                          <div className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-700 text-white font-bold rounded-full shadow-md transition transform duration-300 hover:scale-105">
                            Non Smoking
                          </div>
                          <div className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold rounded-full shadow-md transition transform duration-300 hover:scale-105">
                            Full AC
                          </div>
                        </div>
                        <div className="w-full flex flex-col border-2 border-neutral-400 rounded-md"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="w-1/3 h-20 flex flex-col items-center justify-center bg-white rounded-lg border-4 border-gray-300 px-20 py-4 shadow-lg transform transition duration-300 hover:scale-105">
                        <span className="mt-2 text-xl font-bold text-gray-700">Toilet</span>
                      </div>
                    </div>
                    <div className="flex flex-row xs:w-[1500px] lg:w-full justify-between mt-1 mb-4 px-40">
                      <div className="flex justify-center flex-grow">
                        <div className="flex flex-row gap-64">
                          <div className="relative flex items-center justify-center bg-gradient-to-r from-gray-300 to-gray-100 px-44 py-2 rounded-lg shadow-lg transform transition duration-300 hover:scale-105">
                            <span className="text-2xl font-bold text-gray-700">Tangga</span>
                          </div>
                          <div className="relative flex items-center justify-center bg-gradient-to-r from-gray-300 to-gray-100 px-44 py-2 rounded-lg shadow-lg transform transition duration-300 hover:scale-105">
                            <span className="text-2xl font-bold text-gray-700">Tangga</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center"></div>
                    </div>
                    <hr className="bg-[#D9D9D9] border-0 dark:bg-gray-700 h-1 xs:w-[1300px] lg:w-full lg:mx-40"></hr>
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
        {/* Popup */}
        {isPopupVisible && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="bg-[#FFF5E6] p-6 border-b">
                <h2 className="text-2xl font-bold text-[#2A2A2A] flex items-center gap-2">
                  📋 Meja {selectedTableNumber}
                </h2>
              </div>
              <div className="p-6 space-y-8">
                <div className="space-y-4">
                  {getTableColor(Number(selectedTableNumber)) === "bg-[#D02323]" ? (
                    <div className="space-y-4">
                      <div className="bg-red-100 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-2">
                        ⚠️ Meja sedang digunakan
                      </div>
                      <div className="bg-blue-100 text-blue-700 p-3 rounded-lg flex items-center gap-2">
                        💺 {getCapacityMessage(selectedTableNumber)}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-green-100 border border-green-200 text-green-700 p-4 rounded-lg flex items-center gap-2">
                        ✅ Meja tersedia
                      </div>
                      <div className="bg-blue-100 text-blue-700 p-3 rounded-lg flex items-center gap-2">
                        💺 {getCapacityMessage(selectedTableNumber)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 border-t">
                <button
                  onClick={() => {
                    setIsPopupVisible(false);
                    fetchData();
                  }}
                  className="w-full bg-[#FF8A00] hover:bg-[#FF6A00] text-white py-2 px-4 rounded-lg transition"
                >
                  Tutup
                </button>
                {getTableColor(Number(selectedTableNumber)) === "bg-green-800" && (
                  <button
                    onClick={() => handleSelectTable(selectedTableNumber)}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition mt-3"
                  >
                    Pilih Meja dan Pesan Menu
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Booking1;