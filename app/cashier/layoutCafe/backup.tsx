"use client";

import { useState, useEffect, useRef } from "react";
import SidebarCashier from "@/components/sidebarCashier";
import toast from "react-hot-toast";
import { Inter } from "next/font/google";
import Image from "next/image";
import { X } from "lucide-react";
import io from "socket.io-client";
import moment from "moment-timezone"; // Tambahkan impor ini
const inter = Inter({ subsets: ["latin"] });

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
interface Discount {
  id: number;
  name: string;
  type: "PERCENTAGE" | "NORMAL";
  scope: "MENU" | "TOTAL";
  value: number;
  isActive: boolean;
}

// interface Order {
//   id: number;
//   tableNumber: string;
//   total: number;
//   status: string;
//   paymentMethod?: string;
//   paymentId?: string;
//   createdAt: string;
//   orderItems: OrderItem[];
//   customerName: string;
//   paymentStatus?: string;
//   reservasi?: {
//     id: number;
//     kodeBooking: string;
//   };
// }

interface Order {
  id: number;
  tableNumber: string;
  total: number;
  status: string;
  paymentMethod?: string;
  paymentId?: string;
  createdAt: string;
  orderItems: OrderItem[];
  customerName: string;
  paymentStatus?: string;
  reservasi?: Reservation;
}

interface OrderItem {
  id: number;
  menuId: number;
  quantity: number;
  note?: string;
  menu: Menu;
  modifiers: {
    id: number;
    modifierId: number;
    modifier: {
      id: number;
      name: string;
      price: number;
      category: {
        id: number;
        name: string;
      };
    };
  }[];
}

interface Menu {
  id: number;
  name: string;
  description?: string;
  image: string;
  price: number;
  category: string;
  Status: string;
  modifiers: Modifier[];
  discounts: DiscountInfo[];
}

interface Modifier {
  modifier: {
    id: number;
    name: string;
    price: number;
    category: {
      id: number;
      name: string;
    };
  };
}

interface DiscountInfo {
  discount: Discount;
}

interface CartItem {
  menu: Menu;
  quantity: number;
  note?: string;
  modifierIds: { [categoryId: number]: number | null };
  uniqueKey: string;
}

const Bookinge = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setOrders] = useState<Order[]>([]);
  const [, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [selectedTableOrders, setSelectedTableOrders] = useState<Order[]>([]);
  const [selectedCompletedOrders, setSelectedCompletedOrders] = useState<Order[]>([]);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [selectedTableNumber, setSelectedTableNumber] = useState<string>("");
  const [manuallyMarkedTables, setManuallyMarkedTables] = useState<string[]>([]);
  const [backendMarkedTables, setBackendMarkedTables] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedTableNumberForOrder, setSelectedTableNumberForOrder] = useState<string>("");
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedMenuItems, setSelectedMenuItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [menus, setMenus] = useState<Menu[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState<number | null>(null);
  const [isModifierPopupOpen, setIsModifierPopupOpen] = useState(false);
  const [currentMenu, setCurrentMenu] = useState<Menu | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<number[]>([]);
  const [isDiscountPopupOpen, setIsDiscountPopupOpen] = useState(false);

  // Tambahkan useRef untuk menyimpan socket
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

 

  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        const response = await fetch("/api/diskon");
        const data = await response.json();
        setDiscounts(data.filter((d: Discount) => d.isActive));
      } catch (error) {
        console.error("Error fetching discounts:", error);
      }
    };
    fetchDiscounts();
  }, []);

  const calculateCartTotals = () => {
    let subtotal = 0;
    let totalModifierCost = 0;
    let totalMenuDiscountAmount = 0;
    let totalDiscountAmount = 0;

    selectedMenuItems.forEach((item) => {
      const originalPrice = item.menu.price;
      const modifierTotal = Object.values(item.modifierIds)
        .filter((id): id is number => id !== null)
        .reduce((acc, modifierId) => {
          const modifier = item.menu.modifiers.find((m) => m.modifier.id === modifierId)?.modifier;
          return acc + (modifier?.price || 0);
        }, 0);

      let itemPrice = originalPrice;
      const activeMenuDiscounts = item.menu.discounts.filter((d) => d.discount.isActive);
      if (activeMenuDiscounts.length > 0) {
        activeMenuDiscounts.forEach((d) => {
          const discountAmount =
            d.discount.type === "PERCENTAGE"
              ? (originalPrice * d.discount.value) / 100
              : d.discount.value;
          itemPrice -= discountAmount;
          totalMenuDiscountAmount += discountAmount * item.quantity;
        });
      }

      subtotal += itemPrice * item.quantity;
      totalModifierCost += modifierTotal * item.quantity;
    });

    const subtotalWithModifiers = subtotal + totalModifierCost;

    if (selectedDiscountId) {
      const selectedDiscount = discounts.find((d) => d.id === selectedDiscountId && d.scope === "TOTAL");
      if (selectedDiscount) {
        totalDiscountAmount =
          selectedDiscount.type === "PERCENTAGE"
            ? (subtotalWithModifiers * selectedDiscount.value) / 100
            : selectedDiscount.value;
      }
    }

    const subtotalAfterDiscount = subtotalWithModifiers - totalDiscountAmount;
    const taxAmount = subtotalAfterDiscount * 0.10;
    const gratuityAmount = subtotalAfterDiscount * 0.02;
    const finalTotal = subtotalAfterDiscount + taxAmount + gratuityAmount;

    return {
      subtotal,
      totalModifierCost,
      totalMenuDiscountAmount,
      totalDiscountAmount: totalDiscountAmount + totalMenuDiscountAmount,
      taxAmount,
      gratuityAmount,
      finalTotal,
    };
  };

  const getMenuDiscountedPrice = (menu: Menu) => {
    const originalPrice = menu.price;
    let discountedPrice = originalPrice;

    const activeMenuDiscounts = menu.discounts.filter((d) => d.discount.isActive);
    if (activeMenuDiscounts.length > 0) {
      activeMenuDiscounts.forEach((d) => {
        const discountAmount =
          d.discount.type === "PERCENTAGE"
            ? (originalPrice * d.discount.value) / 100
            : d.discount.value;
        discountedPrice -= discountAmount;
      });
    }

    return { originalPrice, discountedPrice };
  };

  const generateUniqueKey = (menuId: number, modifierIds: { [categoryId: number]: number | null }) => {
    return `${menuId}-${JSON.stringify(modifierIds)}`;
  };

  const addToCart = (menu: Menu, modifierIds: { [categoryId: number]: number | null } = {}) => {
    setSelectedMenuItems((prevCart) => {
      const uniqueKey = generateUniqueKey(menu.id, modifierIds);
      const existingItemIndex = prevCart.findIndex((item) => item.uniqueKey === uniqueKey);

      let updatedCart;
      if (existingItemIndex !== -1) {
        updatedCart = prevCart.map((item, index) =>
          index === existingItemIndex ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        const newItem = {
          menu,
          quantity: 1,
          note: "",
          modifierIds,
          uniqueKey,
        };
        updatedCart = [...prevCart, newItem];
      }

      fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItems: updatedCart }),
      })
        .then((res) => res.json())
        .then((data) => console.log("Cart sent to API:", data))
        .catch((err) => console.error("Error sending cart:", err));

      return updatedCart;
    });
  };


  const handleDiscountToggle = (discountId: number) => {
    setSelectedDiscountId((prev) => (prev === discountId ? null : discountId));
  };

  const saveDiscountToOrder = () => {
    setIsDiscountPopupOpen(false);
  };

  const handleModifierToggle = (modifierId: number) => {
    setSelectedModifiers((prev) =>
      prev.includes(modifierId)
        ? prev.filter((id) => id !== modifierId)
        : [...prev, modifierId]
    );
  };

  const saveModifiersToCart = () => {
    if (currentMenu) {
      const modifierIds: { [categoryId: number]: number | null } = {};
      selectedModifiers.forEach((modifierId) => {
        const modifier = currentMenu.modifiers.find((m) => m.modifier.id === modifierId);
        if (modifier) {
          modifierIds[modifier.modifier.category.id] = modifierId;
        }
      });
      addToCart(currentMenu, modifierIds);
    }
    setIsModifierPopupOpen(false);
    setSelectedModifiers([]);
    setCurrentMenu(null);
  };
  
  useEffect(() => {
    if (isOrderModalOpen) {
      fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItems: selectedMenuItems }),
      });
    }
  }, [selectedMenuItems, isOrderModalOpen]);

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const response = await fetch("/api/getMenu");
        const data = await response.json();
        setMenus(data);
      } catch (error) {
        console.error("Error fetching menus:", error);
      }
    };
    fetchMenus();
  }, []);

  const fetchMeja = async () => {
    try {
      const response = await fetch("/api/nomeja");
      if (!response.ok) throw new Error("Gagal mengambil data meja");
      const data = await response.json();
      console.log("Raw data from /api/nomeja:", data);
      const mejaNumbers = data
        .filter((item: { nomorMeja: number; isManuallyMarked: boolean }) => item.isManuallyMarked)
        .map((item: { nomorMeja: number }) => item.nomorMeja.toString());
      setBackendMarkedTables(mejaNumbers);
      console.log("Fetched meja data:", mejaNumbers);
    } catch (error) {
      console.error("Error fetching meja:", error);
      toast.error("Gagal memuat data meja");
    }
  };

  const markTableAsOccupied = async (tableNumber: string) => {
    try {
      const response = await fetch("/api/nomeja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber }),
      });
  
      if (response.ok) {
        // Perbarui backendMarkedTables secara langsung
        setBackendMarkedTables((prev) => {
          if (!prev.includes(tableNumber)) {
            console.log(`Adding ${tableNumber} to backendMarkedTables`);
            return [...prev, tableNumber];
          }
          return prev;
        });
        await fetchMeja(); // Sinkronkan dengan backend
        if (socketRef.current) {
          console.log(`Emitting tableStatusUpdate for ${tableNumber}`);
          socketRef.current.emit("tableStatusUpdate", { tableNumber });
        }
        toast.success("Meja berhasil ditandai sebagai terisi!");
      } else {
        throw new Error("Gagal menyimpan data meja");
      }
    } catch (error) {
      console.error("Error marking table as occupied:", error);
      toast.error("Gagal menyimpan data meja");
    }
  };
  const resetTable = async (tableNumber: string) => {
    try {
      const response = await fetch("/api/nomeja", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomorMeja: tableNumber }),
      });
  
      if (response.ok) {
        // Hapus dari backendMarkedTables secara langsung
        setBackendMarkedTables((prev) => prev.filter((num) => num !== tableNumber));
        await fetchMeja();
        await fetchData();
        if (socketRef.current) {
          console.log(`Emitting tableStatusUpdate for table ${tableNumber}`);
          socketRef.current.emit("tableStatusUpdate", { tableNumber });
        }
        toast.success("Meja berhasil direset!");
      } else {
        const errorData = await response.json();
        console.error("Error response from API:", errorData);
        throw new Error(errorData.message || "Gagal menghapus data meja");
      }
    } catch (error) {
      console.error("Error resetting table:", error);
      toast.error(error instanceof Error ? error.message : "Gagal menghapus data meja");
    }
  };

  const cancelOrder = async (orderId: number, isReservation: boolean) => {
    try {
      const endpoint = isReservation ? "/api/resetBookingOrder" : "/api/resetTable";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isReservation ? { orderId } : { tableNumber: selectedTableNumber }),
      });
      if (response.ok) {
        toast.success(isReservation ? "Pesanan dan reservasi dibatalkan" : "Pesanan dibatalkan");
        setSelectedTableOrders((prev) => prev.filter((o) => o.id !== orderId));
        fetchData();
        fetchMeja();
        setIsPopupVisible(false);
      } else {
        throw new Error("Gagal membatalkan pesanan");
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error("Gagal membatalkan pesanan");
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  useEffect(() => {
    const savedMarkedTables = localStorage.getItem("manuallyMarkedTables");
    if (savedMarkedTables) {
      setManuallyMarkedTables(JSON.parse(savedMarkedTables));
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchMeja();
  
    // Inisialisasi socket jika belum ada
    if (!socketRef.current) {
      socketRef.current = io("http://localhost:3000", {
        path: "/api/socket",
      });
  
      socketRef.current.on("connect", () => console.log("Connected to WebSocket server"));
  
      socketRef.current.on("ordersUpdated", (data: any) => {
        console.log("Orders updated via WebSocket:", data);
        fetchData();
        if (data.deletedOrderId && selectedTableNumber) {
          fetchTableOrders(selectedTableNumber);
        }
      });
  
      socketRef.current.on("paymentStatusUpdated", (updatedOrder: Order) => {
        console.log("Payment status updated:", updatedOrder);
        setAllOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
          )
        );
        if (
          updatedOrder.tableNumber === selectedTableNumber ||
          updatedOrder.tableNumber.startsWith(`Meja ${selectedTableNumber} -`)
        ) {
          fetchTableOrders(selectedTableNumber);
        }
      });
  
      socketRef.current.on("reservationDeleted", ({ reservasiId, orderId }) => {
        console.log(`Reservation deleted: reservasiId=${reservasiId}, orderId=${orderId}`);
        setAllOrders((prevOrders) => prevOrders.filter((order) => order.id !== orderId));
        fetchTableOrders(selectedTableNumber);
        fetchMeja();
      });
  
      socketRef.current.on("tableStatusUpdate", ({ tableNumber }) => {
        console.log(`Table status updated: ${tableNumber}`);
        // Sinkronkan dengan backend
        fetchMeja().then(() => {
          console.log("Updated backendMarkedTables:", backendMarkedTables);
        });
        fetchData();
      });
    }
  
    // Cleanup saat komponen unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [selectedTableNumber]);

  useEffect(() => {
    localStorage.setItem("manuallyMarkedTables", JSON.stringify(manuallyMarkedTables));
  }, [manuallyMarkedTables]);

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

  const getTableColor = (nomorMeja: number) => {
    const tableNumberStr = nomorMeja.toString();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
  
    // Pesanan onsite aktif hari ini
    const hasActiveOrders = allOrders.some(
      (order) =>
        order.tableNumber === tableNumberStr &&
        !order.reservasi?.kodeBooking && // Hanya pesanan onsite
        new Date(order.createdAt).toDateString() === today.toDateString() &&
        ["pending", "paid", "sedang diproses", "selesai"].includes(order.paymentStatus || order.status)
    );
  
    // Reservasi aktif untuk hari ini
    const hasActiveReservationToday = allOrders.some(
      (order) =>
        order.tableNumber === tableNumberStr &&
        order.reservasi?.kodeBooking &&
        new Date(order.reservasi.tanggalReservasi).toDateString() === today.toDateString() &&
        ["BOOKED", "RESERVED"].includes(order.reservasi.status)
    );
  
    // Cek apakah hanya ada reservasi masa depan
    const hasFutureReservationOnly = allOrders.some(
      (order) =>
        order.tableNumber === tableNumberStr &&
        order.reservasi?.kodeBooking &&
        new Date(order.reservasi.tanggalReservasi) > today &&
        ["BOOKED", "RESERVED"].includes(order.reservasi.status)
    );
  
    // Penandaan manual lokal
    const isMarkedManual = manuallyMarkedTables.includes(tableNumberStr);
  
    // Penandaan backend (hanya relevan jika ada aktivitas hari ini)
    const isMarkedBackend = backendMarkedTables.includes(tableNumberStr);
    const isMarkedBackendRelevant = isMarkedBackend && !hasActiveOrders && !hasActiveReservationToday && !hasFutureReservationOnly;
  
    console.log(`getTableColor for ${tableNumberStr}:`, {
      hasActiveOrders,
      hasActiveReservationToday,
      hasFutureReservationOnly,
      isMarkedBackend,
      isMarkedBackendRelevant,
      isMarkedManual,
      backendMarkedTables,
      manuallyMarkedTables,
    });
  
    // Merah: Jika ada pesanan onsite hari ini, reservasi hari ini, atau ditandai manual
    if (hasActiveOrders || hasActiveReservationToday || isMarkedManual) {
      return "bg-[#D02323]";
    }
  
    // Hijau: Jika hanya ada reservasi masa depan atau kosong
    return "bg-green-800";
  };
  
  const fetchTableOrders = async (tableNumber: string) => {
    try {
      setSelectedTableNumber(tableNumber);
      setIsPopupVisible(true);
      setSelectedTableOrders([]);
      setSelectedCompletedOrders([]);

      const response = await fetch(`/api/orders`);
      if (!response.ok) throw new Error("Gagal mengambil data pesanan");

      const data = await response.json();
      const tableOrders = data.orders.filter((order: Order) =>
        order.tableNumber === tableNumber || order.tableNumber.startsWith(`Meja ${tableNumber} -`)
      );

      const activeOrders = tableOrders.filter((order: Order) =>
        order.status !== "Selesai" || order.reservasi?.kodeBooking
      );
      const completedOrders = tableOrders.filter((order: Order) =>
        order.status === "Selesai" && !order.reservasi?.kodeBooking
      );

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
        const [ordersRes, tableRes] = await Promise.all([
          fetch("/api/orders"),
          fetch(`/api/orders`),
        ]);
        setAllOrders((await ordersRes.json()).orders);
        const tableData = await tableRes.json();
        const filteredOrders = tableData.orders.filter((order: Order) =>
          order.tableNumber === selectedTableNumber || order.tableNumber.startsWith(`Meja ${selectedTableNumber} -`)
        );
        setSelectedTableOrders(filteredOrders.filter((o: Order) => o.status !== "Selesai"));
        setSelectedCompletedOrders(filteredOrders.filter((o: Order) => o.status === "Selesai"));
        toast.success("Pesanan berhasil diselesaikan!");
      } else {
        throw new Error("Gagal menyelesaikan pesanan");
      }
    } catch (error) {
      console.error("Error marking order as completed:", error);
      toast.error("Gagal menyelesaikan pesanan");
    }
  };

  // Dalam OrderCard, tambahkan tanggal & waktu reservasi
  const OrderCard = ({ order, isCompleted, onComplete, isPopup }: { order: Order; isCompleted?: boolean; onComplete?: () => void; isPopup?: boolean }) => {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm border border-[#FFEED9] mb-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-semibold">Order ID: {order.id}</p>
            {order.reservasi?.kodeBooking && (
              <>
                <p className="text-sm text-gray-600">Kode Booking: {order.reservasi.kodeBooking}</p>
                <p className="text-sm text-gray-600">
                  Tanggal & Waktu Reservasi: {moment.tz(order.reservasi.tanggalReservasi, "Asia/Jakarta").format("DD MMMM YYYY HH:mm")}
                </p>
              </>
            )}
            <p className="text-sm text-gray-600">Customer: {order.customerName}</p>
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
          <span
            className={`px-3 py-1 rounded-full text-sm ${
              order.status === "pending"
                ? "bg-yellow-500"
                : order.status === "Sedang Diproses"
                ? "bg-blue-500"
                : "bg-green-500"
            } text-white`}
          >
            {order.status}
          </span>
        </div>
        <div className="border-t pt-3 mt-3">
          <h3 className="font-semibold mb-2">Item Pesanan:</h3>
          <div className="grid gap-2">
            {order.orderItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <Image src={item.menu.image} alt={item.menu.name} width={48} height={48} className="object-cover rounded" />
                <div className="flex-1">
                  <p className="font-medium">{item.menu.name}</p>
                  <p className="text-sm text-gray-600">{item.quantity} x Rp {item.menu.price.toLocaleString()}</p>
                  {item.note && <p className="text-sm text-gray-500">Catatan: {item.note}</p>}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="text-sm text-gray-500">
                      Modifier:
                      {item.modifiers.map((modifier) => (
                        <p key={modifier.id}>- {modifier.modifier.name} (Rp {modifier.modifier.price.toLocaleString()})</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        {!isCompleted && !isPopup && ( // Hanya tampilkan tombol jika bukan popup
          <div className="mt-4 flex justify-end gap-2">
            {order.paymentStatus === "paid" && order.status !== "Selesai" && (
              <>
                <button
                  onClick={onComplete}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                >
                  Konfirmasi Pembayaran
                </button>
                <button
                  onClick={() => cancelOrder(order.id, !!order.reservasiId)}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                >
                  Batal Pesanan
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/orders");
      if (!response.ok) throw new Error("Gagal mengambil data pesanan");
      const data = await response.json();
      setOrders(data.orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setError("Gagal memuat data pesanan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen min-w-[1400px]">
      <div className={`flex h-screen ${inter.className} min-w-[1400px]`}>
        <div
          className={`fixed h-full bg-[#2A2A2A] shadow-xl flex-shrink-0 transition-all duration-300 ${
            isSidebarOpen ? "w-64" : "w-20"
          }`}
        >
          <SidebarCashier isOpen={isSidebarOpen} onToggle={toggleSidebar} />
        </div>
        <div className={`flex-1 p-8 transition-all duration-300 ${isSidebarOpen ? "ml-64" : "ml-20"}`}>
          <div className="w-full sm:px-6 lg:px-28">
            <h2 className="text-4xl font-bold mb-8 text-[#2A2A2A] drop-shadow-sm">🪑 Pilih Meja Anda</h2>
            <div className="mb-8 flex gap-6 border-b-2 border-[#FFEED9] pb-4">
              {[1, 2].map((floor) => (
                <label
                  key={floor}
                  className={`flex items-center space-x-2 px-5 py-2 rounded-full transition-all ${
                    selectedFloor === floor
                      ? "bg-[#FF8A00] text-white shadow-md"
                      : "bg-[#FFEED9] text-[#666] hover:bg-[#FFE4C4]"
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
            <div className="flex flex-col lg:w-full bg-[#FFF5E6] rounded-3xl shadow-lg transform transition-all duration-300 hover:shadow-xl overflow-hidden">
              {selectedFloor === 1 ? (
                <>
                  <div className="xs:w-[1300px] lg:w-full flex flex-row px-40 py-28 space-x-8">
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
                        <h1 className="text-xl md:text-3xl font-extrabold text-black tracking-wide drop-shadow-lg hover:scale-105 transform transition duration-300 ml-24 mt-12">
                          Lantai 1
                        </h1>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex flex-row mt-10">
                          <div className="flex flex-col justify-center items-center mx-4">
                            <div className="flex items-center space-x-2 mb-24">
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
                          <div className="flex flex-col justify-center ml-12 mt-8">
                            <div className="flex items-center space-x-2 mb-8">
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
                            <div className="flex items-center space-x-2 mb-8">
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
                            <div className="flex items-center space-x-2 mb-8">
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
                            <div className="flex items-center space-x-2 mb-8">
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
                      <div className="flex flex-row mt-32 space-y-2">
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
                            <button
                              onClick={() => fetchTableOrders("8")}
                              className={`w-48 h-12 ${getTableColor(8)} rounded`}
                            >
                              <p className="font-bold text-white text-left">8</p>
                            </button>
                            <button
                              onClick={() => fetchTableOrders("9")}
                              className={`w-48 h-12 ${getTableColor(9)} rounded`}
                            >
                              <p className="font-bold text-white text-right">9</p>
                            </button>
                          </div>
                          <div className="flex flex-row items-center">
                            <div className="w-96 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="w-1/2 flex flex-col lg:items-end">
                      <div className="flex flex-row">
                        <div className="relative flex items-center justify-center bg-gradient-to-r from-gray-300 to-gray-100 px-44 py-2 rounded-lg shadow-lg transform transition duration-300 hover:scale-105">
                          <span className="text-2xl font-bold text-gray-700">Tangga</span>
                        </div>
                      </div>
                      <div className="flex flex-row mt-6 mb-2">
                        <div className="flex flex-col mx-2 gap-16">
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2" />
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2" />
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2" />
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2" />
                        </div>
                        <div className="flex flex-row">
                          <div className="flex flex-col items-center">
                            <button
                              onClick={() => fetchTableOrders("10")}
                              className={`w-10 h-40 ${getTableColor(10)} rounded-xl transform transition-all hover:scale-[1.02] hover:shadow-lg relative group`}
                            >
                              <p className="font-bold text-white absolute top-2 left-1/2 transform -translate-x-1/2 text-center">10</p>
                              <div className="absolute inset-0 border-2 border-white/30 rounded-xl" />
                            </button>
                            <button
                              onClick={() => fetchTableOrders("11")}
                              className={`w-10 h-40 ${getTableColor(11)} rounded-xl transform transition-all hover:scale-[1.02] hover:shadow-lg relative group`}
                            >
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
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105" />
                                <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105" />
                              </div>
                            </div>
                            <div className="w-40 h-80 bg-gradient-to-b from-[#EDE3D7] to-[#D9D9D9] border border-gray-300 rounded-xl shadow-2xl transform transition duration-300 hover:scale-105">
                              <div className="flex flex-col items-center justify-center h-full">
                                <h1 className="text-4xl font-bold text-gray-800 text-center">Bar</h1>
                                <button
                                  onClick={() => fetchTableOrders("sementara")}
                                  className={`w-20 h-24 ${getTableColor(37)} rounded-lg transform transition-all hover:scale-105 hover:shadow-lg relative group justify-center items-center`}
                                >
                                  <p className="font-bold text-white justify-center items-center text-center pt-2">cashier</p>
                                  <div className="absolute inset-0 border-2 border-white/30 rounded-lg" />
                                </button>
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
                  <div className="flex flex-row xs:w-[1500px] lg:w-full pl-32 border-neutral-400">
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
                      <div className="flex flex-row justify-center items-center">
                        <div className="flex flex-col gap-8">
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
                          </div>
                          <div className="flex flex-row justify-center items-center">
                            <div className="flex flex-col space-y-10">
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
                      <h1 className="text-xl md:text-5xl font-extrabold text-black tracking-wide drop-shadow-lg hover:scale-105 transform transition duration-300 text-center mt-16 mr-80">
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
                          <div className="w-10 h-8 bg-amber-500 rounded-lg shadow-md transform transition-all hover:scale-105 mt-2 mr-1" />
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
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center space-x-6 ml-24 mt-56">
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
                  </div>
                  <hr className="bg-[#D9D9D9] border-0 dark:bg-gray-700 h-1 xs:w-[1300px] lg:w-full lg:mx-40"></hr>
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
                </div>
              )}
            </div>
          </div>
        </div>
        {isPopupVisible && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
      <div className="bg-[#FFF5E6] p-6 border-b">
        <h2 className="text-2xl font-bold text-[#2A2A2A] flex items-center gap-2">
          📋 Daftar Pesanan - Meja {selectedTableNumber}
        </h2>
      </div>
      <div className="p-6 space-y-8">
        {/* Pesanan Hari Ini */}
        {(() => {
          // const today = new Date("2025-03-07"); // Ganti dengan new Date() di produksi
          const today = new Date; // Ganti dengan new Date() di produksi
          today.setHours(0, 0, 0, 0);
          const todayOrders = allOrders.filter(
            (order) =>
              order.tableNumber === selectedTableNumber &&
              (!order.reservasi?.kodeBooking || // Pesanan onsite
                new Date(order.reservasi?.tanggalReservasi).toDateString() === today.toDateString()) // Reservasi hari ini
          );
          const isMarked = backendMarkedTables.includes(selectedTableNumber);
          console.log(`Popup for Meja ${selectedTableNumber}:`, {
            todayOrders: todayOrders.length,
            isMarked,
            backendMarkedTables,
          });

          if (todayOrders.length > 0 || isMarked) {
            return (
              <div>
                <h3 className="text-xl font-semibold mb-4 text-[#FF8A00] border-b-2 border-[#FF8A00] pb-2">Hari Ini</h3>
                {todayOrders.map((order) => (
                  <OrderCard key={order.id} order={order} onComplete={() => markOrderAsCompleted(order.id)} isPopup={true} />
                ))}
                {!isMarked && todayOrders.length === 0 && (
                  <button
                    onClick={() => markTableAsOccupied(selectedTableNumber)}
                    className="bg-[#D02323] text-white px-4 py-2 rounded-lg hover:bg-[#B21E1E] transition-colors"
                  >
                    Tandai sebagai Terisi
                  </button>
                )}
                {isMarked && todayOrders.length === 0 && (
                  <button
                    onClick={() => resetTable(selectedTableNumber)}
                    className="bg-green-800 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Reset Meja
                  </button>
                )}
              </div>
            );
          }
          return null;
        })()}

        {/* Reservasi Masa Depan */}
        {(() => {
          const today = new Date(); // Ganti dengan new Date() di produksi
          today.setHours(0, 0, 0, 0);
          const futureReservations = allOrders.filter(
            (order) =>
              order.tableNumber === selectedTableNumber &&
              order.reservasi?.kodeBooking &&
              new Date(order.reservasi.tanggalReservasi) > today
          );
          if (futureReservations.length > 0) {
            return (
              <div>
                <h3 className="text-xl font-semibold mb-4 text-[#007BFF] border-b-2 border-[#007BFF] pb-2">Reservasi Masa Depan</h3>
                {futureReservations.map((order) => (
                  <OrderCard key={order.id} order={order} isPopup={true} />
                ))}
              </div>
            );
          }
          return null;
        })()}

        {/* Jika Kosong */}
        {(() => {
          const todayOrders = allOrders.filter(
            (order) =>
              order.tableNumber === selectedTableNumber &&
              (!order.reservasi?.kodeBooking || new Date(order.reservasi?.tanggalReservasi).toDateString() === new Date().toDateString())
          );
          const isMarked = backendMarkedTables.includes(selectedTableNumber);
          console.log(`Kosong check for Meja ${selectedTableNumber}:`, {
            todayOrders: todayOrders.length,
            isMarked,
            backendMarkedTables,
          });
          if (todayOrders.length === 0 && !isMarked) {
            return (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">Belum ada pesanan untuk meja ini hari ini</p>
                <button
                  onClick={() => markTableAsOccupied(selectedTableNumber)}
                  className="bg-[#D02323] text-white px-4 py-2 rounded-lg hover:bg-[#B21E1E] transition-colors"
                >
                  Tandai sebagai Terisi
                </button>
              </div>
            );
          }
          return null;
        })()}
      </div>
      <div className="p-4 border-t flex justify-between gap-4">
        <button
          onClick={() => {
            setSelectedTableNumberForOrder(selectedTableNumber);
            setIsOrderModalOpen(true);
          }}
          className="bg-[#FF8A00] text-white px-4 py-2 rounded-lg hover:bg-[#FF6A00] transition-colors flex-1 text-center"
        >
          Pesan Sekarang
        </button>
        <button
          onClick={() => {
            setIsPopupVisible(false);
            fetchData();
          }}
          className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition flex-1"
        >
          Tutup
        </button>
      </div>
    </div>
  </div>
)}


      {isOrderModalOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Buat Pesanan Baru - Meja {selectedTableNumberForOrder}</h2>
        <button
          onClick={async () => {
            await fetch("/api/cart", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ cartItems: [] }),
            });
            setIsOrderModalOpen(false);
            setSelectedMenuItems([]);
          }}
        >
          <X className="w-6 h-6 text-gray-600 hover:text-green-500" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Nomor Meja</label>
          <input
            type="text"
            value={selectedTableNumberForOrder}
            readOnly
            className="w-full p-2 border rounded-md bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nama Pelanggan</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="Masukkan nama pelanggan"
          />
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Cari Menu</label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2 border rounded-md"
          placeholder="Cari nama menu..."
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Filter Kategori</label>
        <select
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full p-2 border rounded-md"
        >
          <option value="">Semua Kategori</option>
          {Array.from(new Set(menus.map((menu) => menu.category))).map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {menus
          .filter(
            (menu) =>
              (!selectedCategory || menu.category === selectedCategory) &&
              (!searchQuery || menu.name.toLowerCase().includes(searchQuery.toLowerCase()))
          )
          .map((menu) => {
            const { originalPrice, discountedPrice } = getMenuDiscountedPrice(menu);
            return (
              <div
                key={menu.id}
                className="border p-4 rounded-lg flex flex-col items-center justify-between"
              >
                <Image
                  src={menu.image}
                  alt={menu.name}
                  width={96}
                  height={96}
                  className="object-cover rounded-full mb-2"
                />
                <h3 className="font-semibold text-center">{menu.name}</h3>
                <div className="text-center">
                  {discountedPrice < originalPrice ? (
                    <>
                      <p className="text-sm text-gray-600 line-through">
                        Rp {originalPrice.toLocaleString()}
                      </p>
                      <p className="text-sm text-green-600 font-semibold">
                        Rp {discountedPrice.toLocaleString()}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Rp {originalPrice.toLocaleString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setCurrentMenu(menu);
                    setSelectedModifiers([]);
                    setIsModifierPopupOpen(true);
                  }}
                  className="mt-2 bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600"
                >
                  Tambah
                </button>
              </div>
            );
          })}
      </div>

      <div className="mt-6 border-t pt-4">
        <h3 className="text-lg font-semibold mb-4">Keranjang Pesanan</h3>
        {selectedMenuItems.map((item) => {
          const { originalPrice, discountedPrice } = getMenuDiscountedPrice(item.menu);
          const modifierTotal = Object.values(item.modifierIds)
            .filter((id): id is number => id !== null)
            .reduce((acc, modifierId) => {
              const modifier = item.menu.modifiers.find((m) => m.modifier.id === modifierId)?.modifier;
              return acc + (modifier?.price || 0);
            }, 0);
          const modifierNames = Object.values(item.modifierIds)
            .filter((id): id is number => id !== null)
            .map((modifierId) => {
              const modifier = item.menu.modifiers.find((m) => m.modifier.id === modifierId)?.modifier;
              return modifier?.name;
            })
            .filter(Boolean)
            .join(", ");
          const itemNameWithModifiers = modifierNames ? `${item.menu.name} (${modifierNames})` : item.menu.name;

          return (
            <div
              key={item.uniqueKey}
              className="flex justify-between items-center mb-3 p-2 bg-gray-50 rounded"
            >
              <div className="flex-1">
                <p className="font-medium">{itemNameWithModifiers}</p>
                <p className="text-sm text-gray-600">
                  Rp {(discountedPrice + modifierTotal).toLocaleString()} x {item.quantity}
                </p>
                <input
                  type="text"
                  placeholder="Catatan..."
                  value={item.note || ""}
                  onChange={(e) => {
                    setSelectedMenuItems((prev) =>
                      prev.map((prevItem) =>
                        prevItem.uniqueKey === item.uniqueKey
                          ? { ...prevItem, note: e.target.value }
                          : prevItem
                      )
                    );
                  }}
                  className="text-sm mt-1 p-1 border rounded w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedMenuItems((prev) =>
                      prev
                        .map((prevItem) =>
                          prevItem.uniqueKey === item.uniqueKey
                            ? { ...prevItem, quantity: Math.max(0, prevItem.quantity - 1) }
                            : prevItem
                        )
                        .filter((prevItem) => prevItem.quantity > 0)
                    );
                  }}
                  className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 transition"
                >
                  -
                </button>
                <span>{item.quantity}</span>
                <button
                  onClick={() => addToCart(item.menu, item.modifierIds)}
                  className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 transition"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}

        <div className="mt-4">
          <div className="text-lg">
            <p>Subtotal: Rp {calculateCartTotals().subtotal.toLocaleString()}</p>
            <p>Modifier: Rp {calculateCartTotals().totalModifierCost.toLocaleString()}</p>
            <p>Diskon Menu: Rp {calculateCartTotals().totalMenuDiscountAmount.toLocaleString()}</p>
            <p>Diskon Total: Rp {(calculateCartTotals().totalDiscountAmount - calculateCartTotals().totalMenuDiscountAmount).toLocaleString()}</p>
            <p>Pajak (10%): Rp {calculateCartTotals().taxAmount.toLocaleString()}</p>
            <p>Gratuity (2%): Rp {calculateCartTotals().gratuityAmount.toLocaleString()}</p>
            <p className="font-semibold">
              Total Bayar: Rp {calculateCartTotals().finalTotal.toLocaleString()}
            </p>
          </div>

          <div className="mt-2">
            <label className="block text-sm font-medium mb-1">Diskon Total:</label>
            <button
              onClick={() => setIsDiscountPopupOpen(true)}
              className="w-full bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 transition-all font-medium"
            >
              {selectedDiscountId
                ? discounts.find((d) => d.id === selectedDiscountId)?.name || "Pilih Diskon"
                : "Pilih Diskon"}
            </button>
          </div>

          <button
            onClick={async () => {
              if (!customerName) {
                toast.error("Harap isi nama pelanggan");
                return;
              }

              try {
                const totals = calculateCartTotals();
                const response = await fetch("/api/placeOrder", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    customerName,
                    tableNumber: selectedTableNumberForOrder,
                    items: selectedMenuItems.map((item) => ({
                      menuId: item.menu.id,
                      quantity: item.quantity,
                      note: item.note,
                      modifierIds: Object.values(item.modifierIds).filter(
                        (id): id is number => id !== null
                      ),
                    })),
                    total: totals.finalTotal,
                    discountId: selectedDiscountId || null,
                  }),
                });

                if (response.ok) {
                  toast.success("Pesanan berhasil dibuat!");
                  setIsOrderModalOpen(false);
                  setSelectedMenuItems([]);
                  setCustomerName("");
                  setSelectedTableNumberForOrder("");
                  setSelectedDiscountId(null);
                  await fetchData(); // Perbarui data pesanan global
                  await fetchTableOrders(selectedTableNumber); // Perbarui popup meja yang sedang dibuka
                } else {
                  throw new Error("Gagal membuat pesanan");
                }
              } catch (error) {
                console.error("Error:", error);
                toast.error("Gagal membuat pesanan");
              }
            }}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-md mt-4"
          >
            Simpan Pesanan
          </button>
        </div>
      </div>
    </div>
  </div>
)}
        {/* New Modifier Selection Popup */}
        {isModifierPopupOpen && currentMenu && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">
          Tambah Modifier - {currentMenu.name}
        </h2>
        <button
          onClick={() => setIsModifierPopupOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 p-4 overflow-y-auto max-h-[300px]"> {/* Batasi tinggi dan tambahkan scroll */}
        <div className="space-y-3">
          {currentMenu.modifiers.length > 0 ? (
            currentMenu.modifiers.map((mod) => (
              <div
                key={mod.modifier.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-all"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedModifiers.includes(mod.modifier.id)}
                    onChange={() => handleModifierToggle(mod.modifier.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700">{mod.modifier.name}</span>
                </div>
                <span className="text-gray-600 text-sm">
                  +Rp {mod.modifier.price.toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center">Tidak ada modifier tersedia</p>
          )}
        </div>
      </div>
      <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0">
        <button
          onClick={saveModifiersToCart}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-all font-medium"
        >
          Simpan Modifier ({selectedModifiers.length} dipilih)
        </button>
      </div>
    </div>
  </div>
)}

{isDiscountPopupOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Pilih Diskon Total</h2>
        <button
          onClick={() => setIsDiscountPopupOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 p-4 overflow-y-auto max-h-[300px]"> {/* Batasi tinggi dan tambahkan scroll */}
        <div className="space-y-3">
          {discounts.filter((d) => d.scope === "TOTAL").length > 0 ? (
            discounts
              .filter((d) => d.scope === "TOTAL")
              .map((discount) => (
                <div
                  key={discount.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedDiscountId === discount.id}
                      onChange={() => handleDiscountToggle(discount.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700">{discount.name}</span>
                  </div>
                  <span className="text-gray-600 text-sm">
                    {discount.type === "PERCENTAGE"
                      ? `${discount.value}%`
                      : `Rp ${discount.value.toLocaleString()}`}
                  </span>
                </div>
              ))
          ) : (
            <p className="text-gray-500 text-center">Tidak ada diskon total tersedia</p>
          )}
        </div>
      </div>
      <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0">
        <button
          onClick={saveDiscountToOrder}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-all font-medium"
        >
          Simpan Diskon
        </button>
      </div>
    </div>
  </div>
)}
      </div>
      <style jsx global>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
};

export default Bookinge;