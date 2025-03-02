"use client";

import { useEffect, useState } from "react";
import SidebarCashier from "@/components/sidebarCashier";
import toast, { Toaster } from "react-hot-toast";
import { FiBell } from "react-icons/fi";
import { AlertTriangle, ShoppingCart, X } from "lucide-react";
import { useNotifications, MyNotification } from "../../contexts/NotificationContext";
import CombinedPaymentForm from "@/components/combinedPaymentForm";
import { jsPDF } from "jspdf";
import io from "socket.io-client";

interface Menu {
  id: number;
  name: string;
  description?: string;
  image: string;
  price: number;
  category: string;
  Status: string;
  discounts: { discount: Discount }[];
  modifiers: Modifier[];
}

interface Discount {
  id: number;
  name: string;
  type: "PERCENTAGE" | "NORMAL";
  scope: "MENU" | "TOTAL";
  value: number;
  isActive: boolean;
}

interface OrderItem {
  id: number;
  menuId: number;
  quantity: number;
  note?: string;
  price: number;
  discountAmount: number;
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

export interface Order {
  id: number | string;
  customerName: string;
  tableNumber: string;
  total: number;
  discountId?: number;
  discountAmount: number;
  taxAmount: number;
  gratuityAmount: number;
  finalTotal: number;
  status: string;
  paymentMethod?: string;
  paymentId?: string;
  cashGiven?: number;
  change?: number;
  createdAt: string;
  orderItems: OrderItem[];
  discount?: Discount;
  paymentStatus?: string;
  paymentStatusText?: string; // Properti baru
  reservasi?: {
    id: number;
    kodeBooking: string;
  };
}
interface Ingredient {
  id: number;
  name: string;
  stock: number;
  unit: string;
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

interface CartItem {
  menu: Menu;
  quantity: number;
  note: string;
  modifierIds: { [categoryId: number]: number | null };
  uniqueKey: string;
}

const SOCKET_URL = "http://localhost:3000";

export default function KasirPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [actualStocks, setActualStocks] = useState<Record<number, number>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const { notifications, setNotifications } = useNotifications();
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedMenuItems, setSelectedMenuItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [tableNumberInput, setTableNumberInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [menus, setMenus] = useState<Menu[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isNewOrderPaymentModalOpen, setIsNewOrderPaymentModalOpen] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("tunai");
  const [paymentId, setPaymentId] = useState<string>("");
  const [cashGiven, setCashGiven] = useState<string>("");
  const [change, setChange] = useState<number>(0);
  const [selectedDiscountIdNewOrder, setSelectedDiscountIdNewOrder] = useState<number | null>(null);
  const [pendingOrderData, setPendingOrderData] = useState<{
    customerName: string;
    tableNumber: string;
    items: { menuId: number; quantity: number; note: string; modifierIds?: number[] }[];
    total: number;
  } | null>(null);
  const [isModifierPopupOpen, setIsModifierPopupOpen] = useState(false);
  const [currentMenu, setCurrentMenu] = useState<Menu | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<number[]>([]);
  const [isDiscountPopupOpen, setIsDiscountPopupOpen] = useState(false);

  const unreadCount = notifications.filter((notif) => !notif.isRead).length;
  const [isPaymentMethodPopupOpen, setIsPaymentMethodPopupOpen] = useState(false);


  const resetBookingOrder = async (orderId: number) => {
    try {
      const response = await fetch("/api/resetBookingOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      if (!response.ok) throw new Error("Gagal mereset meja reservasi");
      toast.success("Pesanan booking berhasil direset");
      fetchOrders(); // Refresh orders after reset
    } catch (error) {
      console.error("Error:", error);
      toast.error("Gagal mereset meja reservasi");
    }
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

  useEffect(() => {
    const fetchMenusAndDiscounts = async () => {
      try {
        const menuResponse = await fetch("/api/getMenu");
        if (!menuResponse.ok) throw new Error(`Failed to fetch menus: ${menuResponse.status}`);
        const menuData = await menuResponse.json();
        setMenus(menuData);

        const discountResponse = await fetch("/api/diskon");
        if (!discountResponse.ok) throw new Error(`Failed to fetch discounts: ${discountResponse.status}`);
        const discountData = await discountResponse.json();
        setDiscounts(discountData.filter((d: Discount) => d.isActive));
      } catch (error) {
        console.error("Error fetching menus or discounts:", error);
      }
    };
    fetchMenusAndDiscounts();
    fetchOrders();
  }, []);

  useEffect(() => {
    const socketIo = io(SOCKET_URL, {
      path: "/api/socket",
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 5000,
    });
  
    socketIo.on("connect", () => console.log("Terhubung ke WebSocket server:", socketIo.id));
  
    socketIo.on("ordersUpdated", (data: any) => {
      console.log("Pesanan baru atau dihapus:", data);
      fetchOrders();
    });
  
    socketIo.on("paymentStatusUpdated", (updatedOrder: Order) => {
      console.log("Status pembayaran diperbarui:", updatedOrder);
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === updatedOrder.id
            ? {
                ...order,
                ...updatedOrder,
                paymentStatusText:
                  updatedOrder.paymentStatus === "paid" && updatedOrder.paymentMethod === "ewallet"
                    ? "Status Payment: Paid via E-Wallet"
                    : order.paymentStatusText,
              }
            : order
        )
      );
    });
  
    socketIo.on("reservationDeleted", ({ reservasiId, orderId }) => {
      console.log("Reservasi dihapus:", { reservasiId, orderId });
      setOrders((prevOrders) => prevOrders.filter((order) => order.id !== orderId));
      fetchOrders();
    });
  
    socketIo.on("reservationUpdated", (updatedReservasi) => {
      console.log("Reservasi diperbarui:", updatedReservasi);
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.reservasi?.id === updatedReservasi.id
            ? { ...order, reservasi: updatedReservasi }
            : order
        )
      );
    });
  
    // Tambahkan listener untuk perubahan status meja
    socketIo.on("tableStatusUpdated", ({ tableNumber }) => {
      fetchOrders();
    });
  
    socketIo.on("disconnect", () => console.log("Socket terputus"));
  
    setSocket(socketIo);
  
    return () => {
      socketIo.disconnect();
      console.log("WebSocket disconnected");
    };
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const confirmPayment = async (
    orderId: number,
    paymentMethod: string,
    paymentId?: string,
    discountId?: number | null,
    cashGiven?: number,
    change?: number
  ) => {
    setLoading(true);
    setError(null);
    try {
      if (paymentMethod === "tunai" && cashGiven !== undefined && change !== undefined) {
        await updateCartWithPayment(cashGiven.toString(), change);
      }
  
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          paymentMethod,
          paymentId: paymentMethod !== "tunai" ? paymentId : null,
          discountId: discountId || null,
          cashGiven,
          change,
          status: "Sedang Diproses", // Ubah status menjadi "Sedang Diproses" setelah konfirmasi
        }),
      });
  
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Gagal mengonfirmasi pembayaran");
      }
  
      const data = await res.json();
      const updatedOrder = data.order;
  
      setOrders((prevOrders) =>
        prevOrders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
      );
      toast.success("✅ Pembayaran berhasil dikonfirmasi!");
  
      setPaymentMethod("tunai");
      setPaymentId("");
      setCashGiven("");
      setChange(0);
    } catch (error) {
      console.error("Error:", error);
      setError("Gagal mengonfirmasi pembayaran. Silakan coba lagi.");
      toast.error("❌ Gagal mengonfirmasi pembayaran");
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = (uniqueKey: string) => {
    setSelectedMenuItems((prev) => {
      const updatedCart = prev
        .map((item) =>
          item.uniqueKey === uniqueKey
            ? { ...item, quantity: Math.max(0, item.quantity - 1) }
            : item
        )
        .filter((item) => item.quantity > 0);

      fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItems: updatedCart }),
      })
        .then((res) => res.json())
        .then((data) => console.log("Cart updated after removal:", data))
        .catch((err) => console.error("Error updating cart:", err));

      return updatedCart;
    });
  };

  const markOrderAsCompleted = async (orderId: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/completeOrder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Gagal menyelesaikan pesanan");
      }

      toast.success("✅ Pesanan berhasil diselesaikan dan tercatat di riwayat!");
      fetchOrders();
      if (socket) {
        socket.emit("orderCompleted", { orderId });
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("❌ Terjadi kesalahan saat menyelesaikan pesanan.");
      setError(error.message || "Gagal menyelesaikan pesanan.");
    } finally {
      setLoading(false);
    }
  };

  const updateCartWithPayment = async (cashGiven: string, change: number) => {
    try {
      await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: selectedMenuItems,
          cashGiven: parseFloat(cashGiven) || 0,
          change,
        }),
      });
    } catch (error) {
      console.error("Error updating cart with payment info:", error);
    }
  };

  const generateUniqueKey = (menuId: number, modifierIds: { [categoryId: number]: number | null }) => {
    return `${menuId}-${JSON.stringify(modifierIds)}`;
  };

  const addToCart = (menu: Menu, modifierIds: { [categoryId: number]: number | null } = {}) => {
    setSelectedMenuItems((prevCart) => {
      const uniqueKey = generateUniqueKey(menu.id, modifierIds);
      const existingItemIndex = prevCart.findIndex(
        (item) => item.uniqueKey === uniqueKey
      );

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

  const handleNewOrderPayment = async (
    paymentMethod: string,
    paymentId?: string,
    cashGiven?: number,
    change?: number
  ) => {
    if (!pendingOrderData) return;
  
    setLoading(true);
    try {
      if (paymentMethod === "tunai" && cashGiven !== undefined && change !== undefined) {
        await updateCartWithPayment(cashGiven.toString(), change);
      }
  
      const response = await fetch("/api/placeOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: pendingOrderData.customerName,
          tableNumber: pendingOrderData.tableNumber,
          items: pendingOrderData.items,
          total: pendingOrderData.total,
          isCashierOrder: true,
          discountId: selectedDiscountIdNewOrder || null,
          paymentMethod: paymentMethod === "e-wallet" ? "ewallet" : paymentMethod,
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal membuat pesanan");
      }
  
      const data = await response.json();
      const newOrder = data.order;
  
      const finalPaymentMethod = paymentMethod === "e-wallet" ? "ewallet" : paymentMethod;
      await confirmPayment(
        newOrder.id,
        finalPaymentMethod,
        paymentId,
        selectedDiscountIdNewOrder,
        cashGiven,
        change
      );
  
      if (finalPaymentMethod === "ewallet") {
        await fetch("/api/updatePaymentStatus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: newOrder.id,
            paymentMethod: "ewallet",
            paymentStatus: "paid",
            paymentId: paymentId || newOrder.paymentId,
            status: "paid",
          }),
        });
  
        // Set status pembayaran untuk E-Wallet
        setOrders((prevOrders) =>
          prevOrders.map((o) =>
            o.id === newOrder.id ? { ...o, paymentStatusText: "Status Payment: Paid via E-Wallet" } : o
          )
        );
      }
  
      setPendingOrderData(null);
      setPendingOrderId(null);
      setSelectedMenuItems([]);
      setCustomerName("");
      setTableNumberInput("");
      setPaymentMethod("tunai");
      setPaymentId("");
      setCashGiven("");
      setChange(0);
      setSelectedDiscountIdNewOrder(null);
  
      setTimeout(async () => {
        await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartItems: [], cashGiven: 0, change: 0 }),
        });
      }, 5000);
  
      setIsNewOrderPaymentModalOpen(false);
      fetchOrders();
    } catch (error) {
      console.error("Error confirming new order payment:", error);
      toast.error("❌ Gagal mengonfirmasi pesanan dan pembayaran");
    } finally {
      setLoading(false);
    }
  };
  const calculateChange = (given: string) => {
    const total = pendingOrderData?.total || 0;
    const givenNumber = parseFloat(given) || 0;
    const changeAmount = givenNumber - total;
    setChange(changeAmount >= 0 ? changeAmount : 0);
    return changeAmount >= 0 ? changeAmount : 0;
  };

  const cancelOrder = async (orderId: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("✅ Pesanan berhasil dibatalkan!");
        setOrders((prevOrders) => prevOrders.filter((order) => order.id !== orderId));
      } else {
        throw new Error("Gagal membatalkan pesanan");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Gagal membatalkan pesanan. Silakan coba lagi.");
      toast.error("❌ Gagal membatalkan pesanan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const resetTable = async (tableNumber: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/resetTable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber }),
      });
  
      if (res.ok) {
        toast.success(`✅ Meja ${tableNumber} berhasil direset!`);
        fetchOrders();
      } else {
        throw new Error("Gagal mereset meja");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("❌ Terjadi kesalahan saat mereset meja. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const calculateItemPrice = (menu: Menu) => {
    let basePrice = menu.price;
    const activeDiscount = menu.discounts?.find((d) => d.discount.isActive && d.discount.scope === "MENU");
    if (activeDiscount) {
      basePrice -=
        activeDiscount.discount.type === "PERCENTAGE"
          ? (activeDiscount.discount.value / 100) * menu.price
          : activeDiscount.discount.value;
    }
    return basePrice > 0 ? basePrice : 0;
  };

  const calculateCartTotals = () => {
    let subtotal = 0;
    let totalMenuDiscountAmount = 0;
    let totalModifierCost = 0;

    selectedMenuItems.forEach((item) => {
      const originalPrice = item.menu.price;
      const discountedPrice = calculateItemPrice(item.menu);
      subtotal += originalPrice * item.quantity;
      totalMenuDiscountAmount += (originalPrice - discountedPrice) * item.quantity;

      Object.entries(item.modifierIds).forEach(([_, modifierId]) => {
        if (modifierId) {
          const modifier = item.menu.modifiers.find((m) => m.modifier.id === modifierId)?.modifier;
          if (modifier) totalModifierCost += modifier.price * item.quantity;
        }
      });
    });

    const subtotalAfterMenuDiscount = subtotal - totalMenuDiscountAmount;
    const subtotalWithModifiers = subtotalAfterMenuDiscount + totalModifierCost;

    let totalDiscountAmount = totalMenuDiscountAmount;
    if (selectedDiscountIdNewOrder) {
      const selectedDiscount = discounts.find((d) => d.id === selectedDiscountIdNewOrder);
      if (selectedDiscount && selectedDiscount.scope === "TOTAL") {
        const additionalDiscount =
          selectedDiscount.type === "PERCENTAGE"
            ? (selectedDiscount.value / 100) * subtotalWithModifiers
            : selectedDiscount.value;
        totalDiscountAmount += additionalDiscount;
      }
    }

    totalDiscountAmount = Math.min(totalDiscountAmount, subtotalWithModifiers);

    const subtotalAfterAllDiscounts = subtotalWithModifiers - (totalDiscountAmount - totalMenuDiscountAmount);
    const taxAmount = subtotalAfterAllDiscounts * 0.10;
    const gratuityAmount = subtotalAfterAllDiscounts * 0.02;
    const finalTotal = subtotalAfterAllDiscounts + taxAmount + gratuityAmount;

    return {
      subtotal,
      totalMenuDiscountAmount,
      totalModifierCost,
      totalDiscountAmount,
      taxAmount,
      gratuityAmount,
      finalTotal,
    };
  };

  const activeOrders = orders.filter((order) => order.status !== "Selesai");
  const completedOrders = orders.filter((order) => order.status === "Selesai");

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

  const handleInputChange = (id: number, value: number) => {
    setActualStocks((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm("Periksa input Anda sebelum menekan Yes, perubahan tidak akan bisa diganti!")) {
      return;
    }
    const newNotifs: MyNotification[] = [];
    ingredients.forEach((ingredient) => {
      const actual = actualStocks[ingredient.id];
      if (actual !== undefined && actual !== ingredient.stock) {
        const diff = actual - ingredient.stock;
        const message = `Selisih untuk ${ingredient.name} adalah ${diff} ${ingredient.unit}.`;
        const date = new Date().toLocaleString();
        newNotifs.push({ message, date, isRead: false });
        toast.success("Berhasil Validasi Stock Nyata", { position: "top-right" });
        toast.error(message, { position: "top-right" });
      }
    });
    if (newNotifs.length > 0) {
      setNotifications([...notifications, ...newNotifs]);
    }
    setModalOpen(false);
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prevNotifications) =>
      prevNotifications.map((notif) => ({ ...notif, isRead: true }))
    );
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-[#FFFAF0] to-[#FFE4C4]">
      <div className={`h-full fixed transition-all duration-300 ${isSidebarOpen ? "w-64" : "w-20"}`}>
        <SidebarCashier isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      </div>
      <div className={`flex-1 p-6 transition-all duration-300 ${isSidebarOpen ? "ml-64" : "ml-20"}`}>
        <Toaster />
        <h1 className="text-3xl font-bold text-center mb-6 text-[#0E0E0E]">💳 Halaman Kasir</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => setNotificationModalOpen(true)} className="relative">
            <FiBell className="text-3xl text-[#FF8A00]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setIsOrderModalOpen(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg flex items-center gap-2"
          >
            <ShoppingCart className="w-5 h-5" />
            Buat Pesanan Baru
          </button>
        </div>

        {isOrderModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Buat Pesanan Baru</h2>
                <button onClick={() => setIsOrderModalOpen(false)}>
                  <X className="w-6 h-6 text-gray-600 hover:text-red-500" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Nomor Meja</label>
                  <input
                    type="text"
                    value={tableNumberInput}
                    onChange={(e) => setTableNumberInput(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    placeholder="Masukkan nomor meja"
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
                  .filter((menu) => {
                    if (selectedCategory && menu.category !== selectedCategory) return false;
                    if (searchQuery && !menu.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                    return true;
                  })
                  .map((menu) => {
                    const discountedPrice = calculateItemPrice(menu);
                    return (
                      <div key={menu.id} className="border p-4 rounded-lg flex flex-col items-center justify-between">
                        <img src={menu.image} alt={menu.name} className="w-24 h-24 object-cover rounded-full mb-2" />
                        <h3 className="font-semibold text-center">{menu.name}</h3>
                        <div className="text-center">
                          {discountedPrice < menu.price ? (
                            <>
                              <p className="text-sm text-gray-500 line-through">Rp {menu.price.toLocaleString()}</p>
                              <p className="text-sm font-semibold text-green-600">Rp {discountedPrice.toLocaleString()}</p>
                            </>
                          ) : (
                            <p className="text-sm text-gray-600">Rp {menu.price.toLocaleString()}</p>
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
                  const basePriceAfterDiscount = calculateItemPrice(item.menu);
                  let modifierTotal = 0;
                  Object.entries(item.modifierIds).forEach(([_, modifierId]) => {
                    if (modifierId) {
                      const modifier = item.menu.modifiers.find((m) => m.modifier.id === modifierId)?.modifier;
                      if (modifier) modifierTotal += modifier.price;
                    }
                  });
                  const itemPrice = basePriceAfterDiscount + modifierTotal;
                  const itemTotalPrice = itemPrice * item.quantity;
                  const modifierNames = Object.entries(item.modifierIds)
                    .map(([_, modifierId]) =>
                      modifierId ? item.menu.modifiers.find((m) => m.modifier.id === modifierId)?.modifier.name : null
                    )
                    .filter(Boolean)
                    .join(", ");
                  const itemNameWithModifiers = modifierNames ? `${item.menu.name} (${modifierNames})` : item.menu.name;

                  return (
                    <div key={item.uniqueKey} className="flex justify-between items-center mb-3 p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <p className="font-medium">{itemNameWithModifiers}</p>
                        <p className="text-sm text-gray-600">
                          Rp {itemPrice.toLocaleString()} x {item.quantity}
                        </p>
                        <input
                          type="text"
                          placeholder="Catatan..."
                          value={item.note}
                          onChange={(e) => {
                            setSelectedMenuItems((prev) =>
                              prev.map((prevItem) =>
                                prevItem.uniqueKey === item.uniqueKey ? { ...prevItem, note: e.target.value } : prevItem
                              )
                            );
                          }}
                          className="text-sm mt-1 p-1 border rounded w-full"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeFromCart(item.uniqueKey)}
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
                    <p>Diskon: Rp {calculateCartTotals().totalDiscountAmount.toLocaleString()}</p>
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
                      {selectedDiscountIdNewOrder
                        ? discounts.find((d) => d.id === selectedDiscountIdNewOrder)?.name || "Pilih Diskon"
                        : "Pilih Diskon"}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      if (!tableNumberInput || !customerName) {
                        toast.error("Harap isi nomor meja dan nama pelanggan");
                        return;
                      }
                      const totals = calculateCartTotals();
                      setPendingOrderData({
                        customerName,
                        tableNumber: tableNumberInput,
                        items: selectedMenuItems.map((item) => ({
                          menuId: item.menu.id,
                          quantity: item.quantity,
                          note: item.note,
                          modifierIds: Object.values(item.modifierIds).filter((id): id is number => id !== null),
                        })),
                        total: totals.finalTotal,
                      });
                      setIsNewOrderPaymentModalOpen(true);
                      setIsOrderModalOpen(false);
                    }}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-md mt-2"
                    disabled={loading}
                  >
                    {loading ? "Menyimpan..." : "Simpan Pesanan"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

{isNewOrderPaymentModalOpen && pendingOrderData && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg w-full max-w-md">
      <h2 className="text-2xl font-bold mb-4">Konfirmasi Pembayaran Pesanan Baru</h2>
      <p className="text-lg mb-2">Total Bayar (termasuk pajak & gratuity): Rp {pendingOrderData.total.toLocaleString()}</p>
      <div className="space-y-4">
        <button
          onClick={() => setIsPaymentMethodPopupOpen(true)}
          className="w-full bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 transition-all font-medium"
        >
          {paymentMethod === "tunai" ? "Tunai" : paymentMethod === "kartu" ? "Kartu Kredit/Debit" : "E-Wallet"}
        </button>
        {paymentMethod !== "tunai" && (
          <input
            type="text"
            placeholder="Masukkan ID Pembayaran"
            value={paymentId}
            onChange={(e) => setPaymentId(e.target.value)}
            className="w-full p-2 border rounded-md"
          />
        )}
        {paymentMethod === "tunai" && (
          <>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Masukkan jumlah pembayaran"
              value={cashGiven}
              onChange={(e) => {
                const value = e.target.value;
                if (/^[0-9]*\.?[0-9]*$/.test(value)) {
                  setCashGiven(value);
                  const newChange = calculateChange(value);
                  updateCartWithPayment(value, newChange);
                }
              }}
              className="w-full p-2 border rounded-md"
            />
            {change > 0 && (
              <p className="text-green-600">Kembalian: Rp {change.toLocaleString()}</p>
            )}
            {change < 0 && (
              <p className="text-red-600">Uang yang diberikan kurang: Rp {(-change).toLocaleString()}</p>
            )}
          </>
        )}
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={() => {
            setPendingOrderData(null);
            setIsNewOrderPaymentModalOpen(false);
            updateCartWithPayment("", 0);
          }}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md"
        >
          Batal
        </button>
        <button
          onClick={() => {
            if (paymentMethod === "tunai" && (parseFloat(cashGiven) || 0) < pendingOrderData.total) {
              toast.error("Uang yang diberikan kurang");
              return;
            }
            handleNewOrderPayment(paymentMethod, paymentId, parseFloat(cashGiven) || 0, change);
          }}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md"
        >
          Konfirmasi Pembayaran
        </button>
      </div>
    </div>
  </div>
)}

        {error && <p className="text-red-500 text-center">{error}</p>}
        {loading ? (
          <p className="text-center text-[#979797]">Memuat data pesanan...</p>
        ) : (
          <div className="max-w-6xl mx-auto space-y-8">
            <OrderSection
              title="📌 Pesanan Aktif"
              orders={activeOrders}
              confirmPayment={confirmPayment}
              markOrderAsCompleted={markOrderAsCompleted}
              cancelOrder={cancelOrder}
              resetTable={resetTable}
              discounts={discounts}
            />
            <OrderSection
              title="✅ Pesanan Selesai"
              orders={completedOrders}
              resetTable={resetTable}
              resetBookingOrder={resetBookingOrder} // Add this prop
            />
          </div>
        )}
        <div className="flex mt-4">
          <button
            onClick={() => setModalOpen(true)}
            className="px-6 py-3 bg-red-500 hover:bg-red-700 text-[#FCFFFC] rounded-lg text-lg font-semibold flex items-center justify-center space-x-2 transition-all duration-300"
          >
            <span>🚪 Closing</span>
          </button>
          <div className="flex items-start bg-[#FCFFFC] border-l-4 border-[#FF8A00] p-3 rounded-md ml-4">
            <AlertTriangle className="text-[#0E0E0E] w-5 h-5 mr-2 mt-1" />
            <p className="text-sm text-[#0E0E0E]">
              <span className="font-semibold text-[#FF8A00]">Perhatian:</span> Tekan tombol{" "}
              <span className="font-semibold text-[#0E0E0E]">Closing</span> hanya pada saat{" "}
              <span className="font-semibold">closing cafe</span>, untuk validasi stok cafe hari ini.
            </p>
          </div>
        </div>

        {modalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="relative bg-white p-8 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-y-auto">
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Input Stock Nyata Bahan</h2>
              <form onSubmit={handleSubmit}>
                {ingredients.map((ingredient) => (
                  <div key={ingredient.id} className="mb-5">
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      {ingredient.name} <span className="text-gray-500">({ingredient.unit})</span>
                    </label>
                    <input
                      type="number"
                      placeholder="Masukkan stok nyata"
                      onChange={(e) => handleInputChange(ingredient.id, Number(e.target.value))}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      required
                    />
                  </div>
                ))}
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow transition"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

{isPaymentMethodPopupOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Pilih Metode Pembayaran</h2>
        <button
          onClick={() => setIsPaymentMethodPopupOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-3">
          {["tunai", "kartu", "e-wallet"].map((method) => (
            <div
              key={method}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-all"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={paymentMethod === method}
                  onChange={() => {
                    setPaymentMethod(method);
                    setCashGiven("");
                    setChange(0);
                    updateCartWithPayment("", 0);
                    setIsPaymentMethodPopupOpen(false);
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">
                  {method === "tunai" ? "Tunai" : method === "kartu" ? "Kartu Kredit/Debit" : "E-Wallet"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0">
        <button
          onClick={() => setIsPaymentMethodPopupOpen(false)}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-all font-medium"
        >
          Simpan Metode
        </button>
      </div>
    </div>
  </div>
)}

{isPaymentMethodPopupOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Pilih Metode Pembayaran</h2>
        <button
          onClick={() => setIsPaymentMethodPopupOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-3">
          {["tunai", "kartu", "e-wallet"].map((method) => (
            <div
              key={method}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-all"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={paymentMethod === method}
                  onChange={() => {
                    setPaymentMethod(method);
                    setCashGiven("");
                    setChange(0);
                    updateCartWithPayment("", 0);
                    setIsPaymentMethodPopupOpen(false);
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">
                  {method === "tunai" ? "Tunai" : method === "kartu" ? "Kartu Kredit/Debit" : "E-Wallet"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0">
        <button
          onClick={() => setIsPaymentMethodPopupOpen(false)}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-all font-medium"
        >
          Simpan Metode
        </button>
      </div>
    </div>
  </div>
)}

        {notificationModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
            <div className="bg-[#FCFFFC] p-6 rounded shadow-md w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-[#0E0E0E]">Notifications</h2>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="px-4 py-2 bg-[#FF8A00] hover:bg-[#975F2C] text-[#FCFFFC] rounded"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className="text-[#0E0E0E]">Tidak ada notifikasi</p>
              ) : (
                <ul className="space-y-2">
                  {notifications.map((notif, idx) => (
                    <li key={idx} className="border-b border-[#92700C] pb-2">
                      <p className="text-[#0E0E0E]">{notif.message}</p>
                      <p className="text-xs text-[#979797]">{notif.date}</p>
                      {!notif.isRead && (
                        <span className="text-xs bg-red-500 text-white rounded px-2 py-0.5">NEW</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setNotificationModalOpen(false)}
                  className="px-4 py-2 bg-[#FF8A00] hover:bg-[#975F2C] text-[#FCFFFC] rounded"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

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
                      checked={selectedDiscountIdNewOrder === discount.id}
                      onChange={() => setSelectedDiscountIdNewOrder(discount.id)}
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
          onClick={() => setIsDiscountPopupOpen(false)}
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
}

function OrderSection({
  title,
  orders,
  confirmPayment,
  markOrderAsCompleted,
  cancelOrder,
  resetTable,
  resetBookingOrder, // Add this prop
  discounts,
}: {
  title: string;
  orders: Order[];
  confirmPayment?: (orderId: number, paymentMethod: string, paymentId?: string, discountId?: number | null, cashGiven?: number, change?: number) => void;
  markOrderAsCompleted?: (id: number) => void;
  cancelOrder?: (id: number) => void;
  resetTable?: (tableNumber: string) => void;
  resetBookingOrder?: (orderId: number) => void; // Add this prop
  discounts?: Discount[];
}) {
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [combinedTotal, setCombinedTotal] = useState<number>(0);
  const [combinedDetails, setCombinedDetails] = useState<{
    subtotal: number;
    modifier: number;
    discount: number;
    tax: number;
    gratuity: number;
  }>({ subtotal: 0, modifier: 0, discount: 0, tax: 0, gratuity: 0 });
  const [isCombinedPaymentModalOpen, setIsCombinedPaymentModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const selectedOrdersData = orders.filter((order) => selectedOrders.includes(Number(order.id)));
    
    const subtotal = selectedOrdersData.reduce((acc, order) => {
      return acc + order.orderItems.reduce((sum, item) => {
        const basePrice = item.price - (item.modifiers?.reduce((modSum, mod) => modSum + mod.modifier.price, 0) || 0);
        return sum + basePrice * item.quantity;
      }, 0);
    }, 0);

    const modifier = selectedOrdersData.reduce((acc, order) => {
      return acc + (order.orderItems.reduce((sum, item) => {
        return sum + (item.modifiers?.reduce((modSum, mod) => modSum + mod.modifier.price * item.quantity, 0) || 0);
      }, 0));
    }, 0);

    const discount = selectedOrdersData.reduce((acc, order) => acc + (order.discountAmount || 0), 0);
    const subtotalAfterDiscount = subtotal + modifier - discount;
    const tax = subtotalAfterDiscount * 0.10;
    const gratuity = subtotalAfterDiscount * 0.02;
    const finalTotal = subtotalAfterDiscount + tax + gratuity;

    setCombinedDetails({
      subtotal,
      modifier,
      discount,
      tax,
      gratuity,
    });
    setCombinedTotal(finalTotal);
  }, [selectedOrders, orders]);

  const handleOrderSelection = (orderId: number, isChecked: boolean) => {
    if (isChecked) {
      setSelectedOrders((prev) => [...prev, orderId]);
    } else {
      setSelectedOrders((prev) => prev.filter((id) => id !== orderId));
    }
  };

  const handleCombinedPayment = async (
    paymentMethod: string,
    paymentId?: string,
    discountId?: number | null,
    cashGiven?: number,
    change?: number
  ) => {
    const selectedOrdersData = orders.filter((order) => selectedOrders.includes(Number(order.id)));
    if (confirmPayment) {
      for (const order of selectedOrdersData) {
        await confirmPayment(
          Number(order.id),
          paymentMethod,
          paymentId,
          discountId || order.discountId,
          cashGiven,
          change
        );
      }
    }

    const combinedOrder: Order = {
      id: selectedOrdersData.map((o) => o.id).join("-"),
      customerName: "Gabungan Pesanan",
      tableNumber: selectedOrdersData.map((o) => o.tableNumber).join(", "),
      total: combinedDetails.subtotal,
      discountAmount: combinedDetails.discount,
      taxAmount: combinedDetails.tax,
      gratuityAmount: combinedDetails.gratuity,
      finalTotal: combinedTotal,
      paymentMethod,
      orderItems: selectedOrdersData.flatMap((o) => o.orderItems),
      createdAt: new Date().toISOString(),
      status: "Sedang Diproses",
      cashGiven,
      change,
    };

    generateCombinedPDF(combinedOrder);
    setSelectedOrders([]);
    setCombinedTotal(0);
    setCombinedDetails({ subtotal: 0, modifier: 0, discount: 0, tax: 0, gratuity: 0 });
    setIsCombinedPaymentModalOpen(false);
  };

  const groupedOrders = orders.reduce((acc, order) => {
    const tableNumber = order.tableNumber;
    if (!acc[tableNumber]) {
      acc[tableNumber] = [];
    }
    acc[tableNumber].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">{title}</h2>
      {orders.length === 0 ? (
        <p className="text-gray-500">Tidak ada pesanan.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedOrders).map(([tableNumber, tableOrders]) => (
            <div key={tableNumber} className="bg-white shadow-md rounded-lg p-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Meja {tableNumber}</h3>
                {resetTable && title === "✅ Pesanan Selesai" && (
                  <button
                    onClick={() => resetTable(tableNumber)}
                    className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-md transition"
                  >
                    ⟳ Reset Meja
                  </button>
                )}
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {tableOrders.map((order: Order) => (
                  <OrderItemComponent
                  key={order.id}
                  order={order}
                  confirmPayment={confirmPayment}
                  markOrderAsCompleted={markOrderAsCompleted}
                  cancelOrder={cancelOrder}
                  onSelectOrder={handleOrderSelection}
                  isSelected={selectedOrders.includes(Number(order.id))}
                  discounts={discounts || []}
                  resetBookingOrder={resetBookingOrder} // Pass the prop
                />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {selectedOrders.length > 0 && (
        <div className="mt-4">
          <p className="text-lg font-semibold">
            Total Gabungan: Rp {combinedTotal.toLocaleString()}
          </p>
          <button
            onClick={() => setIsCombinedPaymentModalOpen(true)}
            className="w-full bg-[#4CAF50] hover:bg-[#45a049] text-white py-2 rounded-md transition flex items-center justify-center"
          >
            💰 Gabungkan Pesanan
          </button>
        </div>
      )}
      {isCombinedPaymentModalOpen && (
        <CombinedPaymentForm
          total={combinedTotal}
          details={combinedDetails}
          onConfirmPayment={handleCombinedPayment}
          onCancel={() => {
            setSelectedOrders([]);
            setCombinedTotal(0);
            setCombinedDetails({ subtotal: 0, modifier: 0, discount: 0, tax: 0, gratuity: 0 });
            setIsCombinedPaymentModalOpen(false);
          }}
          discounts={discounts}
        />
      )}
    </div>
  );
}

function OrderItemComponent({
  order,
  confirmPayment,
  markOrderAsCompleted,
  cancelOrder,
  onSelectOrder,
  isSelected,
  discounts,
  resetBookingOrder,
}: {
  order: Order;
  confirmPayment?: (orderId: number, paymentMethod: string, paymentId?: string, discountId?: number | null, cashGiven?: number, change?: number) => void;
  markOrderAsCompleted?: (id: number) => void;
  cancelOrder?: (id: number) => void;
  onSelectOrder?: (orderId: number, isChecked: boolean) => void;
  isSelected?: boolean;
  discounts: Discount[];
  resetBookingOrder?: (orderId: number) => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<string>(order.paymentMethod || "tunai");
  const [paymentId, setPaymentId] = useState<string>(order.paymentId || "");
  const [cashGiven, setCashGiven] = useState<string>("");
  const [change, setChange] = useState<number>(0);
  const [confirmation, setConfirmation] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [selectedDiscountId, setSelectedDiscountId] = useState<number | null>(order.discountId || null);
  const [isDiscountPopupOpen, setIsDiscountPopupOpen] = useState(false);
  const [isPaymentMethodPopupOpen, setIsPaymentMethodPopupOpen] = useState(false);
  const [paymentStatusText, setPaymentStatusText] = useState<string>(order.paymentStatusText || "");

  const isPaidOrder = order.status === "paid" || (order.paymentStatus === "paid" && order.paymentMethod === "ewallet");

  const calculateTotals = (discountId: number | null) => {
    let subtotal = 0;
    let totalModifierCost = 0;
    let totalMenuDiscountAmount = order.orderItems.reduce((sum, item) => sum + item.discountAmount, 0);

    order.orderItems.forEach((item) => {
      const basePrice = item.price - (item.modifiers?.reduce((sum, mod) => sum + mod.modifier.price, 0) || 0);
      subtotal += basePrice * item.quantity;
      totalModifierCost += (item.modifiers?.reduce((sum, mod) => sum + mod.modifier.price * item.quantity, 0) || 0);
    });

    let totalDiscountAmount = totalMenuDiscountAmount;

    if (discountId) {
      const selectedDiscount = discounts.find((d) => d.id === discountId);
      if (selectedDiscount && selectedDiscount.scope === "TOTAL") {
        const baseForDiscount = subtotal + totalModifierCost - totalMenuDiscountAmount;
        const additionalDiscount =
          selectedDiscount.type === "PERCENTAGE"
            ? (selectedDiscount.value / 100) * baseForDiscount
            : selectedDiscount.value;
        totalDiscountAmount += additionalDiscount;
      }
    }

    totalDiscountAmount = Math.min(totalDiscountAmount, subtotal + totalModifierCost);

    const baseForTaxAndGratuity = subtotal + totalModifierCost - totalDiscountAmount;
    const taxAmount = baseForTaxAndGratuity * 0.10;
    const gratuityAmount = baseForTaxAndGratuity * 0.02;
    const finalTotal = baseForTaxAndGratuity + taxAmount + gratuityAmount;

    return {
      subtotal,
      totalModifierCost,
      totalDiscountAmount,
      taxAmount,
      gratuityAmount,
      finalTotal,
    };
  };

  const totals = calculateTotals(selectedDiscountId);

  useEffect(() => {
    const newTotals = calculateTotals(selectedDiscountId);
    setLocalDiscountAmount(newTotals.totalDiscountAmount);
    setLocalFinalTotal(newTotals.finalTotal);
    setLocalTaxAmount(newTotals.taxAmount);
    setLocalGratuityAmount(newTotals.gratuityAmount);
  }, [selectedDiscountId, order]);

  const [localDiscountAmount, setLocalDiscountAmount] = useState<number>(totals.totalDiscountAmount);
  const [localFinalTotal, setLocalFinalTotal] = useState<number>(totals.finalTotal);
  const [localTaxAmount, setLocalTaxAmount] = useState<number>(totals.taxAmount);
  const [localGratuityAmount, setLocalGratuityAmount] = useState<number>(totals.gratuityAmount);

  const calculateChange = (given: string) => {
    const total = localFinalTotal;
    const givenNumber = parseFloat(given) || 0;
    const changeAmount = givenNumber - total;
    setChange(changeAmount >= 0 ? changeAmount : 0);
  };

  const handleCashGivenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^[0-9]*\.?[0-9]*$/.test(value)) {
      setCashGiven(value);
      calculateChange(value);
    }
  };

  const handlePaymentMethodSelect = (method: string) => {
    setPaymentMethod(method);
    setCashGiven("");
    setChange(0);
    setIsPaymentMethodPopupOpen(false);
  };

  const handleConfirmPayment = () => {
    if (paymentMethod === "tunai") {
      const given = parseFloat(cashGiven) || 0;
      if (given < localFinalTotal) {
        toast.error("Uang yang diberikan kurang");
        return;
      }
    }
    confirmPayment?.(Number(order.id), paymentMethod, paymentId, selectedDiscountId, Number(cashGiven), change);
    if (paymentMethod === "ewallet") {
      setPaymentStatusText("Status Payment: Paid via E-Wallet");
    } else if (paymentMethod === "tunai") {
      setPaymentStatusText("Status Payment: Paid via Cash");
    } else if (paymentMethod === "kartu") {
      setPaymentStatusText("Status Payment: Paid via Card");
    }
  };

  return (
    <div className="bg-[#FF8A00] p-3 rounded-lg">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-sm font-medium">Order ID: {order.id}</h4>
          {order.reservasi?.kodeBooking && (
            <p className="text-sm text-white">Kode Booking: {order.reservasi.kodeBooking}</p>
          )}
          <p className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 px-4 py-2 rounded shadow-md">
            Customer: {order.customerName}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="mt-2 text-gray-700">
        <p>Subtotal: <span className="font-semibold">Rp {totals.subtotal.toLocaleString()}</span></p>
        <p>Modifier: <span className="font-semibold">Rp {totals.totalModifierCost.toLocaleString()}</span></p>
        <p>Diskon: <span className="font-semibold">Rp {localDiscountAmount.toLocaleString()}</span></p>
        <p>Pajak: <span className="font-semibold">Rp {localTaxAmount.toLocaleString()}</span></p>
        <p>Gratuity: <span className="font-semibold">Rp {localGratuityAmount.toLocaleString()}</span></p>
        <p className="font-semibold">
          Total Bayar: Rp {localFinalTotal.toLocaleString()}
        </p>
      </div>
      <ul className="mt-3 space-y-1">
        {order.orderItems.map((item) => (
          <li key={item.id} className="flex items-center space-x-2">
            <img src={item.menu.image} alt={item.menu.name} className="w-8 h-8 object-cover rounded" />
            <span>
              {item.menu.name} - {item.quantity} pcs
              {item.discountAmount > 0 && (
                <span className="block text-sm text-green-600">
                  Diskon: Rp {(item.discountAmount / item.quantity).toLocaleString()} per item
                </span>
              )}
              {item.note && (
                <span className="block text-sm text-gray-600">Catatan: {item.note}</span>
              )}
              {item.modifiers && item.modifiers.length > 0 && (
                <span className="block text-sm text-gray-600">
                  Modifier: {item.modifiers.map((mod) => `${mod.modifier.name} (Rp${mod.modifier.price.toLocaleString()})`).join(", ")}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {isPaidOrder && order.status !== "Sedang Diproses" && order.status !== "Selesai" && (
        <div className="mt-4 space-y-2">
          {/* Tampilkan status pembayaran */}
          {(paymentStatusText || (order.paymentStatus === "paid" && order.paymentMethod === "ewallet")) && (
            <p className="text-green-600 font-semibold">
              {paymentStatusText || "Status Payment: Paid via E-Wallet"}
            </p>
          )}
          <button
            onClick={() => confirmPayment?.(Number(order.id), order.paymentMethod || "ewallet", order.paymentId, selectedDiscountId)}
            className="w-full bg-[#4CAF50] hover:bg-[#45a049] text-white py-2 rounded-md transition"
          >
            💰 Konfirmasi Pembayaran
          </button>
          <button
            onClick={() =>
              setConfirmation({
                message: "Sudah yakin untuk membatalkan pesanan?",
                onConfirm: () => {
                  cancelOrder?.(Number(order.id));
                  setConfirmation(null);
                },
              })
            }
            className="w-full bg-[#8A4210] hover:bg-[#975F2C] text-white py-2 rounded-md transition"
          >
            ❌ Batal Pesanan
          </button>
        </div>
      )}

      {order.status === "pending" && confirmPayment && (
        <div className="mt-4 space-y-2">
          {paymentStatusText && (
            <p className="text-green-600 font-semibold">{paymentStatusText}</p>
          )}
          <button
            onClick={() => setIsDiscountPopupOpen(true)}
            className="w-full bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 transition-all font-medium"
          >
            {selectedDiscountId
              ? discounts.find((d) => d.id === selectedDiscountId)?.name || "Pilih Diskon"
              : "Pilih Diskon"}
          </button>
          <button
            onClick={() => setIsPaymentMethodPopupOpen(true)}
            className="w-full bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 transition-all font-medium"
          >
            {paymentMethod === "tunai" ? "Tunai" : paymentMethod === "kartu" ? "Kartu Kredit/Debit" : "E-Wallet"}
          </button>
          {paymentMethod !== "tunai" && (
            <input
              type="text"
              placeholder="Masukkan ID Pembayaran"
              value={paymentId}
              onChange={(e) => setPaymentId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          )}
          {paymentMethod === "tunai" && (
            <>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Masukkan jumlah pembayaran"
                value={cashGiven}
                onChange={handleCashGivenChange}
                className="w-full p-2 border border-gray-300 rounded-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              {change > 0 && (
                <p className="text-green-600">Kembalian: Rp {change.toLocaleString()}</p>
              )}
              {change < 0 && (
                <p className="text-red-600">
                  Uang yang diberikan kurang: Rp {(-change).toLocaleString()}
                </p>
              )}
            </>
          )}
          <button
            onClick={handleConfirmPayment}
            className="w-full bg-[#4CAF50] hover:bg-[#45a049] text-white py-2 rounded-md transition"
          >
            💰 Konfirmasi Pembayaran
          </button>
          <button
            onClick={() =>
              setConfirmation({
                message: "Sudah yakin untuk membatalkan pesanan?",
                onConfirm: () => {
                  cancelOrder?.(Number(order.id));
                  setConfirmation(null);
                },
              })
            }
            className="w-full bg-[#8A4210] hover:bg-[#975F2C] text-white py-2 rounded-md transition"
          >
            ❌ Batal Pesanan
          </button>
        </div>
      )}

      {order.status === "Sedang Diproses" && markOrderAsCompleted && (
        <div className="mt-4 space-y-2">
          {paymentStatusText && (
            <p className="text-green-600 font-semibold">{paymentStatusText}</p>
          )}
          <button
            onClick={() =>
              setConfirmation({
                message: "Sudah yakin untuk menyelesaikan pesanan?",
                onConfirm: () => {
                  markOrderAsCompleted(Number(order.id));
                  setConfirmation(null);
                },
              })
            }
            className="w-full bg-[#4CAF50] hover:bg-[#45a049] text-white py-2 rounded-md transition"
          >
            ✅ Tandai Selesai
          </button>
          <button
            onClick={() =>
              setConfirmation({
                message: "Sudah yakin untuk mencetak struk pesanan?",
                onConfirm: () => {
                  generatePDF(order);
                  setConfirmation(null);
                },
              })
            }
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md transition"
          >
            🖨️ Cetak Struk
          </button>
        </div>
      )}

      {order.status === "Selesai" && (
        <div className="mt-4 space-y-2">
          <button
            onClick={() => generatePDF(order)}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md transition"
          >
            🖨️ Cetak Struk
          </button>
          {order.reservasi?.kodeBooking && resetBookingOrder && (
            <button
              onClick={() => resetBookingOrder(Number(order.id))}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-md transition"
            >
              Reset meja reservasi
            </button>
          )}
        </div>
      )}

      {onSelectOrder && (order.status === "pending" || order.status === "paid") && (
        <div className="mt-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelectOrder(Number(order.id), e.target.checked)}
            className="mr-2 w-6 h-6"
          />
          <span className="text-sm">Pilih untuk merge</span>
        </div>
      )}
      {confirmation && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <p className="text-gray-800 text-center">{confirmation.message}</p>
            <div className="mt-4 flex justify-center space-x-4">
              <button
                onClick={confirmation.onConfirm}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmation(null)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
              >
                No
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
            <div className="flex-1 p-4 overflow-y-auto">
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
                            onChange={() => setSelectedDiscountId(discount.id)}
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
                onClick={() => setIsDiscountPopupOpen(false)}
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-all font-medium"
              >
                Simpan Diskon
              </button>
            </div>
          </div>
        </div>
      )}

      {isPaymentMethodPopupOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Pilih Metode Pembayaran</h2>
              <button
                onClick={() => setIsPaymentMethodPopupOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-3">
                {["tunai", "kartu", "ewallet"].map((method) => (
                  <div
                    key={method}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={paymentMethod === method}
                        onChange={() => handlePaymentMethodSelect(method)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-gray-700">
                        {method === "tunai" ? "Tunai" : method === "kartu" ? "Kartu Kredit/Debit" : "E-Wallet"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0">
              <button
                onClick={() => setIsPaymentMethodPopupOpen(false)}
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-all font-medium"
              >
                Simpan Metode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function StatusBadge({ status }: { status: string }) {
  let color = "bg-[#979797]";
  if (status === "pending") color = "bg-[#FF8A00]";
  if (status === "Sedang Diproses") color = "bg-[#92700C]";
  if (status === "Selesai") color = "bg-[#4CAF50]";

  return (
    <span className={`px-3 py-1 text-white text-sm rounded-full ${color}`}>
      {status}
    </span>
  );
}

//struk1
function generatePDF(order: Order) {
  const margin = 5;
  const pageWidth = 58;
  const pageHeight = 200;
  const doc = new jsPDF({ unit: "mm", format: [pageWidth, pageHeight] });

  let yPosition = margin;

  const checkPage = () => {
    if (yPosition > pageHeight - 10) {
      doc.addPage();
      yPosition = margin;
    }
  };

  const logoBase64 = "";
  const logoWidth = 20;
  const logoHeight = 20;
  doc.addImage(logoBase64, "PNG", (pageWidth - logoWidth) / 2, yPosition, logoWidth, logoHeight);
  yPosition += logoHeight + 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  checkPage();
  doc.text("Notarich Cafe", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const address = "Jl. Mejobo Perum Kompleks Nojorono No.2c, Megawonbaru, Mlati Norowito, Kec. Kota Kudus, Kabupaten Kudus, Jawa Tengah 59319";
  const addressLines = doc.splitTextToSize(address, pageWidth - margin * 2);
  addressLines.forEach((line: string) => {
    checkPage();
    doc.text(line, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 4;
  });
  yPosition += 2;

  doc.setLineWidth(0.3);
  doc.setDrawColor(150);
  checkPage();
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  const labelX = margin;
  const colonX = margin + 22;
  const valueX = margin + 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const now = new Date();
  const tanggal = now.toLocaleDateString();
  const hari = now.toLocaleDateString("id-ID", { weekday: "long" });
  const jam = now.toLocaleTimeString();

  checkPage();
  doc.text("Tanggal", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(tanggal, valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Hari", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(hari, valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Jam", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(jam, valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Kasir", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text("Kasir 1", valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Meja", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(String(order.tableNumber), valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Order ID", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(String(order.id), valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Nama", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(order.customerName || "-", valueX, yPosition);
  yPosition += 7;

  checkPage();
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  doc.setFont("helvetica", "bold");
  checkPage();
  doc.text("Pesanan", margin, yPosition);
  yPosition += 5;
  doc.setFont("helvetica", "bold");
  checkPage();
  doc.text("Item", margin, yPosition);
  doc.text("Total", pageWidth - margin, yPosition, { align: "right" });
  yPosition += 7;

  const truncateMenuName = (name: string) => {
    const maxItemNameLength = 19;
    if (name.length > maxItemNameLength) {
      const firstLine = name.substring(0, maxItemNameLength);
      const secondLine = name.substring(maxItemNameLength);
      return [firstLine, secondLine];
    } else {
      return [name];
    }
  };

  order.orderItems.forEach((item) => {
    const [firstLine, secondLine] = truncateMenuName(item.menu.name);
    checkPage();
    doc.setFont("helvetica", "bold");
    doc.text(firstLine, margin, yPosition);
    yPosition += 5;

    if (secondLine) {
      checkPage();
      doc.setFont("helvetica", "bold");
      doc.text(secondLine, margin, yPosition);
      yPosition += 5;
    }

    const itemPriceAfterDiscount = item.price - (item.discountAmount / item.quantity);
    checkPage();
    doc.setFont("helvetica", "bold");
    doc.text(`${item.quantity} x ${itemPriceAfterDiscount.toLocaleString()}`, margin, yPosition);
    const itemTotal = itemPriceAfterDiscount * item.quantity;
    doc.text(`Rp ${itemTotal.toLocaleString()}`, pageWidth - margin, yPosition, { align: "right" });
    yPosition += 5;

    if (item.modifiers && item.modifiers.length > 0) {
      checkPage();
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      item.modifiers.forEach((modifier) => {
        doc.text(`- ${modifier.modifier.name} (Rp ${modifier.modifier.price.toLocaleString()})`, margin, yPosition);
        yPosition += 4;
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
    }

    // Perubahan pada bagian catatan: membungkus teks otomatis agar tidak terpotong
    if (item.note) {
      checkPage();
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      const noteText = `Catatan: ${item.note}`;
      const noteLines = doc.splitTextToSize(noteText, pageWidth - margin * 2);
      noteLines.forEach((line) => {
        checkPage();
        doc.text(line, margin, yPosition);
        yPosition += 4;
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
    }
  });

  checkPage();
  yPosition += 3;
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  doc.setFont("helvetica", "bold");
  const totalQty = order.orderItems.reduce((acc, item) => acc + item.quantity, 0);

  checkPage();
  doc.text("Total qty", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(String(totalQty), valueX, yPosition);
  yPosition += 3;

  checkPage();
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Subtotal", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text("Rp " + order.total.toLocaleString(), valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Diskon", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text("Rp " + order.discountAmount.toLocaleString(), valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Pajak (10%)", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text("Rp " + order.taxAmount.toLocaleString(), valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Gratuity (2%)", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text("Rp " + order.gratuityAmount.toLocaleString(), valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Total Bayar", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text("Rp " + order.finalTotal.toLocaleString(), valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  doc.setFont("helvetica", "normal");
  checkPage();
  doc.text("Pembayaran", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(order.paymentMethod || "-", valueX, yPosition);
  yPosition += 3;

  checkPage();
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Uang Diberikan", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(`Rp ${order.cashGiven?.toLocaleString() || "0"}`, valueX, yPosition);
  yPosition += 5;

  checkPage();
  doc.text("Kembalian", labelX, yPosition);
  doc.text(":", colonX, yPosition);
  doc.text(`Rp ${order.change?.toLocaleString() || "0"}`, valueX, yPosition);
  yPosition += 7;

  doc.setFont("helvetica", "italic");
  checkPage();
  doc.text("Terimakasih telah berkunjung!", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 5;
  checkPage();
  doc.text("Semoga hari Anda menyenangkan!", pageWidth / 2, yPosition, { align: "center" });

  doc.save(`struk_order_${order.id}.pdf`);
}


//struk2
function generateCombinedPDF(order: Order) {
const margin = 5;
const pageWidth = 58;
const pageHeight = 250;
const doc = new jsPDF({
  unit: "mm",
  format: [pageWidth, pageHeight],
});

let yPosition = margin;

const checkPage = () => {
  if (yPosition > pageHeight - 10) {
    doc.addPage();
    yPosition = margin;
  }
};
const logoBase64 = "";
const logoWidth = 20;
const logoHeight = 20;
doc.addImage(logoBase64, "PNG", (pageWidth - logoWidth) / 2, yPosition, logoWidth, logoHeight);
yPosition += logoHeight + 6;

doc.setFont("helvetica", "bold");
doc.setFontSize(10);
checkPage();
doc.text("Notarich Cafe", pageWidth / 2, yPosition, { align: "center" });
yPosition += 6;

doc.setFont("helvetica", "normal");
doc.setFontSize(8);
const address = "Jl. Mejobo Perum Kompleks Nojorono No.2c, Megawonbaru, Mlati Norowito, Kec. Kota Kudus, Kabupaten Kudus, Jawa Tengah 59319";
const addressLines = doc.splitTextToSize(address, pageWidth - margin * 2);
addressLines.forEach((line: string) => {
  checkPage();
  doc.text(line, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 4;
});
yPosition += 2;

doc.setFontSize(9);
checkPage();
doc.text("Struk Gabungan Pesanan", pageWidth / 2, yPosition, { align: "center" });
yPosition += 5;

doc.setLineWidth(0.3);
doc.setDrawColor(150);
checkPage();
doc.line(margin, yPosition, pageWidth - margin, yPosition);
yPosition += 5;

const labelX = margin;
const colonX = margin + 22;
const valueX = margin + 24;

doc.setFont("helvetica", "normal");
doc.setFontSize(8);
const now = new Date();
const tanggal = now.toLocaleDateString();
const hari = now.toLocaleDateString("id-ID", { weekday: "long" });
const jam = now.toLocaleTimeString();

checkPage();
doc.text("Tanggal", labelX, yPosition);
doc.text(":", colonX, yPosition);
doc.text(tanggal, valueX, yPosition);
yPosition += 5;

checkPage();
doc.text("Hari", labelX, yPosition);
doc.text(":", colonX, yPosition);
doc.text(hari, valueX, yPosition);
yPosition += 5;

checkPage();
doc.text("Jam", labelX, yPosition);
doc.text(":", colonX, yPosition);
doc.text(jam, valueX, yPosition);
yPosition += 5;

checkPage();
doc.text("Kasir", labelX, yPosition);
doc.text(":", colonX, yPosition);
doc.text("Kasir 1", valueX, yPosition);
yPosition += 5;

checkPage();
doc.text("Meja", labelX, yPosition);
doc.text(":", colonX, yPosition);
doc.text(String(order.tableNumber), valueX, yPosition);
yPosition += 5;

checkPage();
doc.text("Order ID", labelX, yPosition);
doc.text(":", colonX, yPosition);
doc.text(String(order.id), valueX, yPosition);
yPosition += 5;

checkPage();
doc.text("Nama", labelX, yPosition);
doc.text(":", colonX, yPosition);
doc.text(order.customerName || "-", valueX, yPosition);
yPosition += 5;

checkPage();
doc.line(margin, yPosition, pageWidth - margin, yPosition);
yPosition += 5;

doc.setFont("helvetica", "bold");
checkPage();
doc.text("Pesanan", margin, yPosition);
yPosition += 5;
doc.setFont("helvetica", "bold");
checkPage();
doc.text("Item", margin, yPosition);
doc.text("Total", pageWidth - margin, yPosition, { align: "right" });
yPosition += 5;

const truncateMenuName = (name: string) => {
  const maxItemNameLength = 19;
  if (name.length > maxItemNameLength) {
    const firstLine = name.substring(0, maxItemNameLength);
    const secondLine = name.substring(maxItemNameLength);
    return [firstLine, secondLine];
  } else {
    return [name];
  }
};

order.orderItems.forEach((item) => {
  const [firstLine, secondLine] = truncateMenuName(item.menu.name);
  checkPage();
  doc.setFont("helvetica", "bold");
  doc.text(firstLine, margin, yPosition);
  yPosition += 5;

  if (secondLine) {
    checkPage();
    doc.setFont("helvetica", "bold");
    doc.text(secondLine, margin, yPosition);
    yPosition += 5;
  }

  const itemPriceAfterDiscount = item.price - (item.discountAmount / item.quantity);
  checkPage();
  doc.setFont("helvetica", "bold");
  doc.text(`${item.quantity} x ${itemPriceAfterDiscount.toLocaleString()}`, margin, yPosition);
  const itemTotal = itemPriceAfterDiscount * item.quantity;
  doc.text(`Rp ${itemTotal.toLocaleString()}`, pageWidth - margin, yPosition, { align: "right" });
  yPosition += 5;

  if (item.modifiers && item.modifiers.length > 0) {
    checkPage();
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    item.modifiers.forEach((modifier) => {
      doc.text(`- ${modifier.modifier.name} (Rp ${modifier.modifier.price.toLocaleString()})`, margin, yPosition);
      yPosition += 4;
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
  }

  if (item.note) {
    checkPage();
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    const noteText = `Catatan: ${item.note}`;
    const noteLines = doc.splitTextToSize(noteText, pageWidth - margin * 2);
    noteLines.forEach((line) => {
      checkPage();
      doc.text(line, margin, yPosition);
      yPosition += 4;
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
  }
});

checkPage();
yPosition += 3;
doc.line(margin, yPosition, pageWidth - margin, yPosition);
yPosition += 5;

doc.setFont("helvetica", "bold");
const totalQty = order.orderItems.reduce((acc, item) => acc + item.quantity, 0);

checkPage();
doc.text("Total qty", labelX, yPosition);
doc.text(":", colonX, yPosition);
doc.text(String(totalQty), valueX, yPosition);
yPosition += 5;

checkPage();
doc.line(margin, yPosition, pageWidth - margin, yPosition);
yPosition += 5;

checkPage();
doc.text("Subtotal", labelX, yPosition);
doc.text(":", colonX, yPosition);
doc.text("Rp " + order.total.toLocaleString(), valueX, yPosition);
yPosition += 5;

checkPage();
doc.text("Diskon", labelX, yPosition);
doc.text(":", colonX, yPosition);
doc.text("Rp " + order.discountAmount.toLocaleString(), valueX, yPosition);
yPosition += 5;

checkPage();
doc.text("Pajak (10%)", labelX, yPosition);
doc.text(":", colonX, yPosition);
doc.text("Rp " + order.taxAmount.toLocaleString(), valueX, yPosition);
yPosition += 5;

checkPage();
doc.text("Gratuity (2%)", labelX, yPosition);
doc.text(":", colonX, yPosition);
doc.text("Rp " + order.gratuityAmount.toLocaleString(), valueX, yPosition);
yPosition += 5;

checkPage();
doc.text("Total Bayar", labelX, yPosition);
doc.text(":", colonX, yPosition);
doc.text("Rp " + order.finalTotal.toLocaleString(), valueX, yPosition);
yPosition += 5;

checkPage();
doc.line(margin, yPosition, pageWidth - margin, yPosition);
yPosition += 5;

doc.setFont("helvetica", "normal");
checkPage();
doc.text("Pembayaran", labelX, yPosition);
doc.text(":", colonX, yPosition);
doc.text(order.paymentMethod || "-", valueX, yPosition);
yPosition += 5;

checkPage();
doc.line(margin, yPosition, pageWidth - margin, yPosition);
yPosition += 5;

checkPage();
doc.text("Uang Diberikan", labelX, yPosition);
doc.text(":", colonX, yPosition);
doc.text(`Rp ${order.cashGiven?.toLocaleString() || "0"}`, valueX, yPosition);
yPosition += 5;

checkPage();
doc.text("Kembalian", labelX, yPosition);
doc.text(":", colonX, yPosition);
doc.text(`Rp ${order.change?.toLocaleString() || "0"}`, valueX, yPosition);
yPosition += 7;

doc.setFont("helvetica", "italic");
checkPage();
doc.text("Terimakasih telah berkunjung!", pageWidth / 2, yPosition, { align: "center" });
yPosition += 5;
checkPage();
doc.text("Semoga hari Anda menyenangkan!", pageWidth / 2, yPosition, { align: "center" });

doc.save(`struk_gabungan_${order.id}.pdf`);
}