"use client";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Inter } from "next/font/google";
import { useRouter } from "next/navigation";
import moment from "moment-timezone";
import io from "socket.io-client";
import CryptoJS from "crypto-js";

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
  reservasiId?: number | null;
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

interface Reservation {
  id: number;
  namaCustomer: string;
  nomorKontak: string;
  tanggalReservasi: string;
  durasiPemesanan: string;
  nomorMeja: string;
  kodeBooking: string;
  status: string;
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
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [popupReservations, setPopupReservations] = useState<Reservation[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const secretKey = "your-secret-key-here";

  // Fetch data reservasi
  useEffect(() => {
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
  
        console.log("Meja data in Booking1:", JSON.stringify(mejaData, null, 2));
        console.log("Orders in Booking1:", JSON.stringify(ordersData.orders, null, 2));
        console.log("Reservations in Booking1:", JSON.stringify(reservasiData, null, 2));
  
        const today = moment.tz("Asia/Jakarta").startOf("day").toDate();
        const mejaNumbers = mejaData
          .filter((item: { nomorMeja: number; isManuallyMarked: boolean; markedAt: Date | null }) => {
            const isMarked = item.isManuallyMarked;
            const markedAt = item.markedAt ? new Date(item.markedAt) : null;
            const isMarkedValid =
              isMarked &&
              markedAt &&
              (today.getTime() - markedAt.getTime()) / (1000 * 60 * 60) < 24;
            console.log(
              `Table ${item.nomorMeja}: isManuallyMarked=${isMarked}, markedAt=${markedAt}, isMarkedValid=${isMarkedValid}`
            );
            return isMarkedValid;
          })
          .map((item: { nomorMeja: number }) => item.nomorMeja.toString());
        setBackendMarkedTables(mejaNumbers);
  
        setAllOrders(ordersData.orders);
        if (!isPopupVisible) setReservations(reservasiData);
  
        if (typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          let selectedDateTime = urlParams.get("selectedDateTime");
  
          console.log("URL Params selectedDateTime:", selectedDateTime);
  
          if (!selectedDateTime) {
            const reservationData: ReservationData = JSON.parse(
              sessionStorage.getItem("reservationData") || "{}"
            );
            selectedDateTime = reservationData.selectedDateTime;
            console.log("SessionStorage reservationData:", reservationData);
            console.log("No selectedDateTime in URL, falling back to sessionStorage:", selectedDateTime);
          }
  
          if (selectedDateTime) {
            const parsedDate = moment.tz(selectedDateTime, "Asia/Jakarta").startOf("day").toDate();
            setSelectedDate(parsedDate);
            console.log("Parsed selectedDate:", parsedDate.toISOString().split("T")[0]);
          } else {
            const today = moment.tz("Asia/Jakarta").startOf("day").toDate();
            setSelectedDate(today);
            console.log("No selectedDateTime found, defaulting to today:", today.toISOString().split("T")[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Gagal memuat data");
      }
    };
  
    fetchData();
  
    const interval = setInterval(() => {
      if (!isPopupVisible) fetchData();
    }, 5000);
  
    const socket = io("http://localhost:3000", { path: "/api/socket" });
    socket.on("connect", () => console.log("Connected to WebSocket in Booking1"));
    socket.on("ordersUpdated", (data) => {
      console.log("WebSocket ordersUpdated in Booking1:", data);
      fetchData();
    });
    socket.on("paymentStatusUpdated", (updatedOrder: Order) => {
      console.log("WebSocket paymentStatusUpdated in Booking1:", updatedOrder);
      setAllOrders((prev) =>
        prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
      );
    });
    socket.on("tableStatusUpdated", ({ tableNumber }: { tableNumber: string }) => {
      console.log(`WebSocket tableStatusUpdated in Booking1: ${tableNumber}`);
      fetchData();
    });
  
    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [isPopupVisible]);

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


  // Menentukan warna meja berdasarkan status
  const getTableColor = (nomorMeja: number) => {
    const tableNumberStr = nomorMeja.toString();
    const today = moment.tz("Asia/Jakarta").startOf("day").toDate();
  
    if (!selectedDate) {
      const hasActiveOrders = allOrders.some((order) => {
        const orderDate = moment.tz(order.createdAt, "Asia/Jakarta").startOf("day").toDate();
        const isToday = orderDate.getTime() === today.getTime();
        const isActiveOrder = ["pending", "paid", "sedang diproses", "selesai"].includes(order.status.toLowerCase());
        return order.tableNumber === tableNumberStr && isActiveOrder && isToday && !order.reservasiId;
      });
      const isMarkedBackend = backendMarkedTables.includes(tableNumberStr);
      return hasActiveOrders || isMarkedBackend ? "bg-[#D02323]" : "bg-green-800";
    }
  
    const selectedDateStart = moment.tz(selectedDate, "Asia/Jakarta").startOf("day").toDate();
  
    const hasActiveOrdersToday =
      selectedDateStart.getTime() === today.getTime() &&
      allOrders.some((order) => {
        const orderDate = moment.tz(order.createdAt, "Asia/Jakarta").startOf("day").toDate();
        const isToday = orderDate.getTime() === today.getTime();
        const isActiveOrder = ["pending", "paid", "sedang diproses", "selesai"].includes(order.status.toLowerCase());
        return order.tableNumber === tableNumberStr && isActiveOrder && isToday && !order.reservasiId;
      });
  
    const hasActiveReservation = reservations.some((reservasi) => {
      const reservasiDate = moment.tz(reservasi.tanggalReservasi, "Asia/Jakarta").startOf("day").toDate();
      const isSameDate = reservasiDate.getTime() === selectedDateStart.getTime();
      return (
        reservasi.nomorMeja === tableNumberStr &&
        ["BOOKED", "RESERVED"].includes(reservasi.status) &&
        isSameDate
      );
    });
  
    const isMarkedBackend =
      backendMarkedTables.includes(tableNumberStr) &&
      selectedDateStart.getTime() === today.getTime() &&
      !reservations.some((r) => r.nomorMeja === tableNumberStr && moment(r.tanggalReservasi).isAfter(today));
  
    const isOccupied = hasActiveOrdersToday || hasActiveReservation || isMarkedBackend;
    console.log(
      `Table ${tableNumberStr} FINAL: SelectedDate=${selectedDateStart.toISOString().split("T")[0]}, Today=${today.toISOString().split("T")[0]}, HasActiveOrdersToday=${hasActiveOrdersToday}, HasActiveReservation=${hasActiveReservation}, IsMarkedBackend=${isMarkedBackend}, Color=${isOccupied ? "bg-[#D02323]" : "bg-green-800"}`
    );
  
    return isOccupied ? "bg-[#D02323]" : "bg-green-800";
  };
  const fetchTableDetails = async (tableNumber: string) => {
    try {
      setSelectedTableNumber(tableNumber);
      setSelectedTableOrders([]);
      setSelectedCompletedOrders([]);
      setPopupReservations([]);
      setIsPopupVisible(true);

      const response = await fetch(`/api/orders?tableNumber=${tableNumber}`);
      const reservasiResponse = await fetch("/api/reservasi");
      if (!response.ok || !reservasiResponse.ok) throw new Error("Gagal mengambil data");

      const orderData = await response.json();
      const reservasiData = await reservasiResponse.json();

      console.log("Reservations from fetchTableDetails:", JSON.stringify(reservasiData, null, 2));

      const tableOrders = orderData.orders.filter((order: Order) => order.tableNumber === tableNumber);
      const activeOrders = tableOrders.filter((order: Order) => order.status !== "Selesai");
      const completedOrders = tableOrders.filter((order: Order) => order.status === "Selesai");

      const tableReservations = reservasiData.filter(
        (r: Reservation) => String(r.nomorMeja) === tableNumber && (r.status === "BOOKED" || r.status === "RESERVED")
      );

      setSelectedTableOrders(activeOrders);
      setSelectedCompletedOrders(completedOrders);
      setPopupReservations(tableReservations);
    } catch (error) {
      console.error("Error fetching table details:", error);
      toast.error("Gagal memuat data");
      setIsPopupVisible(false);
    }
  };

  const handleSelectTable = (tableNumber: string) => {
    
    const reservationData: ReservationData = JSON.parse(sessionStorage.getItem("reservationData") || "{}");
    const selectedDateTime = reservationData.selectedDateTime;
  
    if (!selectedDateTime) {
      toast.error("Tanggal reservasi tidak ditemukan. Silakan kembali ke halaman reservasi.");
      router.push("/reservasi");
      return;
    }
  
    const selectedDate = new Date(selectedDateTime);
    const selectedDayStart = moment(selectedDate).tz("Asia/Jakarta").startOf("day").toDate();
    const selectedDayEnd = moment(selectedDate).tz("Asia/Jakarta").endOf("day").toDate();
  
    const hasConflict = popupReservations.some((r) => {
      const reservasiDate = moment.tz(r.tanggalReservasi, "Asia/Jakarta").startOf("day").toDate();
      const isSameDate = reservasiDate.getTime() === selectedDayStart.getTime();
      console.log(
        `Popup Table ${tableNumber} - Conflict Check: ReservasiDate=${reservasiDate.toISOString().split("T")[0]}, SelectedDate=${selectedDayStart.toISOString().split("T")[0]}, IsSameDate=${isSameDate}, Status=${r.status}`
      );
      return (
        r.nomorMeja === tableNumber &&
        (r.status === "BOOKED" || r.status === "RESERVED") &&
        isSameDate
      );
    });
  
    if (hasConflict) {
      toast.error("Meja ini sudah dipesan pada tanggal yang dipilih.");
      return;
    }
  
    // Encrypt the tableNumber
    const encryptedTableNumber = CryptoJS.AES.encrypt(tableNumber, secretKey).toString();
    const urlSafeEncryptedTableNumber = encodeURIComponent(encryptedTableNumber);
  
    // Store the original (unencrypted) tableNumber in sessionStorage
    reservationData.meja = tableNumber;
    sessionStorage.setItem("reservationData", JSON.stringify(reservationData));
  
    // Pass the encrypted tableNumber in the URL
    router.push(
      `/menu?table=${urlSafeEncryptedTableNumber}&reservation=true&bookingCode=${reservationData.kodeBooking}`
    );
    setIsPopupVisible(false);
  };

  const hasActiveOrders = (tableNumber: string) => {
    return allOrders.some((order) => order.tableNumber === tableNumber);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen min-w-[1400px]">
      <div className={`flex h-screen ${inter.className} min-w-[1400px]`}>
        <div className={`flex-1 p-8 transition-all duration-300`}>
          <div className="w-full sm:px-6 lg:px-28 pt-16">
            <h2 className="text-4xl font-bold mb-8 text-[#2A2A2A] drop-shadow-sm sticky top-0  z-10 py-4">
              🪑 Pilih Meja Anda untuk{" "}
              {selectedDate ? moment(selectedDate).tz("Asia/Jakarta").format("DD MMMM YYYY") : "Pilih Tanggal"}
            </h2>

            {/* Floor Selection */}
            <div className="mb-8 flex gap-6 border-b-2 border-[#FFEED9] pb-4 sticky top-24  z-10">
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
                                onClick={() => fetchTableDetails("1")}
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
                                onClick={() => fetchTableDetails("2")}
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
                                onClick={() => fetchTableDetails("3")}
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
                                onClick={() => fetchTableDetails("4")}
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
                                onClick={() => fetchTableDetails("5")}
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
                                onClick={() => fetchTableDetails("6")}
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
                                onClick={() => fetchTableDetails("7")}
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
                            <button onClick={() => fetchTableDetails("8")} className={`w-48 h-12 ${getTableColor(8)} rounded`}>
                              <p className="font-bold text-white text-left">8</p>
                            </button>
                            <button onClick={() => fetchTableDetails("9")} className={`w-48 h-12 ${getTableColor(9)} rounded`}>
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
                            <button onClick={() => fetchTableDetails("10")} className={`w-10 h-40 ${getTableColor(10)} rounded-xl transform transition-all hover:scale-[1.02] hover:shadow-lg relative group`}>
                              <p className="font-bold text-white absolute top-2 left-1/2 transform -translate-x-1/2 text-center">10</p>
                              <div className="absolute inset-0 border-2 border-white/30 rounded-xl" />
                            </button>
                            <button onClick={() => fetchTableDetails("11")} className={`w-10 h-40 ${getTableColor(11)} rounded-xl transform transition-all hover:scale-[1.02] hover:shadow-lg relative group`}>
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
                                onClick={() => fetchTableDetails("12")}
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
                        onClick={() => fetchTableDetails("18")}
                        className={`w-1/6 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(18)}`}
                      >
                        <p className="font-bold text-white">18</p>
                      </button>
                      <button
                        onClick={() => fetchTableDetails("19")}
                        className={`w-1/6 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(19)}`}
                      >
                        <p className="font-bold text-white">19</p>
                      </button>
                      <button
                        onClick={() => fetchTableDetails("20")}
                        className={`w-1/6 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(20)}`}
                      >
                        <p className="font-bold text-white">20</p>
                      </button>
                      <button
                        onClick={() => fetchTableDetails("21")}
                        className={`w-1/6 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(21)}`}
                      >
                        <p className="font-bold text-white">21</p>
                      </button>
                      <button
                        onClick={() => fetchTableDetails("22")}
                        className={`w-1/6 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(22)}`}
                      >
                        <p className="font-bold text-white">22</p>
                      </button>
                      <button
                        onClick={() => fetchTableDetails("23")}
                        className={`w-1/6 h-12 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(23)}`}
                      >
                        <p className="font-bold text-white">23</p>
                      </button>
                    </div>
                    <div className="xs:w-[1500px] lg:w-full flex flex-row">
                      <div className="w-1/2">
                        <div className="flex flex-row">
                          <button
                            onClick={() => fetchTableDetails("17")}
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
                              onClick={() => fetchTableDetails("24")}
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
                                  onClick={() => fetchTableDetails("13")}
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
                                  onClick={() => fetchTableDetails("14")}
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
                                  onClick={() => fetchTableDetails("15")}
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
                                  onClick={() => fetchTableDetails("16")}
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
                                  onClick={() => fetchTableDetails("36")}
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
                                      onClick={() => fetchTableDetails("32")}
                                      className={`w-12 h-48 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(32)}`}
                                    >
                                      <p className="font-bold text-white">32</p>
                                    </button>
                                    <button
                                      onClick={() => fetchTableDetails("31")}
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
                                          onClick={() => fetchTableDetails("35")}
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
                                          onClick={() => fetchTableDetails("34")}
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
                                          onClick={() => fetchTableDetails("33")}
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
                                    onClick={() => fetchTableDetails("30")}
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
                              onClick={() => fetchTableDetails("26")}
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
                              onClick={() => fetchTableDetails("27")}
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
                              onClick={() => fetchTableDetails("28")}
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
                              onClick={() => fetchTableDetails("29")}
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
                                  onClick={() => fetchTableDetails("25")}
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
                                    onClick={() => fetchTableDetails("25")}
                                    className={`w-8 h-80 rounded-xl flex items-center justify-center shadow-md transform transition duration-300 hover:scale-105 gap-12 ${getTableColor(25)}`}
                                  >
                                    <p className="font-bold text-white">25</p>
                                  </button>
                                  <button
                                    onClick={() => fetchTableDetails("25")}
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
              <div className="p-6 Salvspace-y-8">
                <div className="space-y-4">
                  {getTableColor(Number(selectedTableNumber)) === "bg-[#D02323]" ? (
                    <div className="bg-red-100 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-2">
                      ⚠️ Meja sedang digunakan atau dipesan hari ini
                    </div>
                  ) : (
                    <div className="bg-green-100 border border-green-200 text-green-700 p-4 rounded-lg flex items-center gap-2">
                      ✅ Meja tersedia hari ini
                    </div>
                  )}
                  <div className="bg-blue-100 text-blue-700 p-3 rounded-lg flex items-center gap-2">
                    💺 {getCapacityMessage(selectedTableNumber)}
                  </div>
                  {popupReservations.length > 0 && (
                    <div className="bg-yellow-100 text-yellow-700 p-3 rounded-lg">
                      <h3 className="font-semibold">Jadwal Reservasi:</h3>
                      <ul>
                        {popupReservations.map((r) => (
                          <li key={r.id}>
                            {moment(r.tanggalReservasi).tz("Asia/Jakarta").format("DD MMMM YYYY HH:mm")} - {r.namaCustomer} ({r.kodeBooking})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              {/* <div className="p-4 border-t flex justify-end gap-4">
  <button
    onClick={() => setIsPopupVisible(false)}
    className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition"
  >
    Tutup
  </button>
  {(() => {
    const reservationData: ReservationData = JSON.parse(sessionStorage.getItem("reservationData") || "{}");
    const selectedDateTime = reservationData.selectedDateTime || (selectedDate ? selectedDate.toISOString() : null);

    if (!selectedDateTime) {
      console.log(`Table ${selectedTableNumber} - No selectedDateTime available`);
      return (
        <button
          onClick={() => router.push("/reservasi")}
          className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-lg transition"
        >
          Kembali ke Reservasi
        </button>
      );
    }

    const effectiveDate = selectedDate || new Date(selectedDateTime);
    const selectedDayStart = moment(effectiveDate).tz("Asia/Jakarta").startOf("day").toDate();
    const today = moment.tz("Asia/Jakarta").startOf("day").toDate();

    const hasActiveOrdersToday =
  selectedDayStart.getTime() === today.getTime() &&
  selectedTableOrders.some((order) => {
    const isActiveOrder = ["pending", "paid", "sedang diproses", "selesai"].includes(order.status.toLowerCase());
    console.log(
      `Popup Table ${selectedTableNumber} - Order Check: Order ID=${order.id}, Status=${order.status}, Active=${isActiveOrder}`
    );
    return isActiveOrder && !order.reservasiId;
  });

    const isMarkedBackend = backendMarkedTables.includes(selectedTableNumber);
    // Sinkronkan dengan logika getTableColor
    const hasFutureReservation = popupReservations.some((r) => {
      const reservasiDate = moment.tz(r.tanggalReservasi, "Asia/Jakarta").startOf("day").toDate();
      return (
        r.nomorMeja === selectedTableNumber &&
        (r.status === "BOOKED" || r.status === "RESERVED") &&
        reservasiDate.getTime() > today.getTime()
      );
    });
    const isMarkedBackendRelevant = isMarkedBackend && selectedDayStart.getTime() === today.getTime() && !hasFutureReservation;

    const hasConflict = popupReservations.some((r) => {
      const reservasiDate = moment.tz(r.tanggalReservasi, "Asia/Jakarta").startOf("day").toDate();
      const isSameDate = reservasiDate.getTime() === selectedDayStart.getTime();
      console.log(
        `Popup Table ${selectedTableNumber} - Conflict Check: ReservasiDate=${reservasiDate.toISOString().split("T")[0]}, SelectedDate=${selectedDayStart.toISOString().split("T")[0]}, IsSameDate=${isSameDate}, Status=${r.status}`
      );
      return (
        r.nomorMeja === selectedTableNumber &&
        (r.status === "BOOKED" || r.status === "RESERVED") &&
        isSameDate
      );
    });

    console.log(
      `Popup Table ${selectedTableNumber} FINAL: Effective Date=${selectedDayStart.toISOString().split("T")[0]}, HasActiveOrdersToday=${hasActiveOrdersToday}, IsMarkedBackend=${isMarkedBackend}, HasFutureReservation=${hasFutureReservation}, IsMarkedBackendRelevant=${isMarkedBackendRelevant}, HasConflict=${hasConflict}`
    );

    if (hasActiveOrdersToday || isMarkedBackendRelevant) {
      return null; // Meja onsite hanya untuk hari ini
    } else if (hasConflict) {
      return (
        <button
          onClick={() => router.push("/reservasi")}
          className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-lg transition"
        >
          Silahkan pilih tanggal lain
        </button>
      );
    } else {
      return (
        <button
          onClick={() => handleSelectTable(selectedTableNumber)}
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition"
        >
          Silahkan pilih meja dan pesan menu
        </button>
      );
    }
  })()}
</div> */}
            <div className="p-4 border-t flex justify-end gap-4">
  <button
    onClick={() => setIsPopupVisible(false)}
    className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition"
  >
    Tutup
  </button>
  {(() => {
    const reservationData: ReservationData = JSON.parse(sessionStorage.getItem("reservationData") || "{}");
    const selectedDateTime = reservationData.selectedDateTime || (selectedDate ? selectedDate.toISOString() : null);

    if (!selectedDateTime) {
      console.log(`Table ${selectedTableNumber} - No selectedDateTime available`);
      return (
        <button
          onClick={() => router.push("/reservasi")}
          className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-lg transition"
        >
          Kembali ke Reservasi
        </button>
      );
    }

    const effectiveDate = selectedDate || new Date(selectedDateTime);
    const selectedDayStart = moment(effectiveDate).tz("Asia/Jakarta").startOf("day").toDate();
    const today = moment.tz("Asia/Jakarta").startOf("day").toDate();

    const hasActiveOrdersToday =
      selectedDayStart.getTime() === today.getTime() &&
      selectedTableOrders.some((order) => {
        const isActiveOrder = ["pending", "paid", "sedang diproses", "selesai"].includes(order.status.toLowerCase());
        console.log(
          `Popup Table ${selectedTableNumber} - Order Check: Order ID=${order.id}, Status=${order.status}, Active=${isActiveOrder}`
        );
        return isActiveOrder && !order.reservasiId;
      });

    const isMarkedBackend = backendMarkedTables.includes(selectedTableNumber) && selectedDayStart.getTime() === today.getTime();

    const hasConflict = popupReservations.some((r) => {
      const reservasiDate = moment.tz(r.tanggalReservasi, "Asia/Jakarta").startOf("day").toDate();
      const isSameDate = reservasiDate.getTime() === selectedDayStart.getTime();
      console.log(
        `Popup Table ${selectedTableNumber} - Conflict Check: ReservasiDate=${reservasiDate.toISOString().split("T")[0]}, SelectedDate=${selectedDayStart.toISOString().split("T")[0]}, IsSameDate=${isSameDate}, Status=${r.status}`
      );
      return (
        r.nomorMeja === selectedTableNumber &&
        (r.status === "BOOKED" || r.status === "RESERVED") &&
        isSameDate
      );
    });

    const tableColor = getTableColor(Number(selectedTableNumber));
    console.log(
      `Popup Table ${selectedTableNumber} FINAL: Effective Date=${selectedDayStart.toISOString().split("T")[0]}, HasActiveOrdersToday=${hasActiveOrdersToday}, IsMarkedBackend=${isMarkedBackend}, HasConflict=${hasConflict}, TableColor=${tableColor}`
    );

    if (tableColor === "bg-[#D02323]") {
      return hasConflict ? (
        <button
          onClick={() => router.push("/reservasi")}
          className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-lg transition"
        >
          Silahkan pilih tanggal lain
        </button>
      ) : null; // Tidak ada tombol jika merah tanpa konflik reservasi
    } else if (hasConflict) {
      return (
        <button
          onClick={() => router.push("/reservasi")}
          className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-lg transition"
        >
          Silahkan pilih tanggal lain
        </button>
      );
    } else {
      return (
        <button
          onClick={() => handleSelectTable(selectedTableNumber)}
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition"
        >
          Silahkan pilih meja dan pesan menu
        </button>
      );
    }
  })()}
</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Booking1;