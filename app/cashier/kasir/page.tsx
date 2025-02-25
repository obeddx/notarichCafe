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
  createdAt: string;
  orderItems: OrderItem[];
  discount?: Discount;
}

interface Ingredient {
  id: number;
  name: string;
  stock: number;
  unit: string;
}

interface CartItem {
  menu: Menu;
  quantity: number;
  note: string;
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

  const unreadCount = notifications.filter((notif) => !notif.isRead).length;

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
        setDiscounts(discountData.filter((d: Discount) => d.scope === "TOTAL" && d.isActive));
      } catch (error) {
        console.error("Error fetching menus or discounts:", error);
      }
    };
    fetchMenusAndDiscounts();
    fetchOrders();
  }, []);

  useEffect(() => {
    fetch("/api/socket")
      .then(() => console.log("API /api/socket dipanggil"))
      .catch((err) => console.error("Error memanggil API /api/socket:", err));

    const socketIo = io(SOCKET_URL, {
      path: "/api/socket",
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 5000,
    });

    socketIo.on("connect", () => console.log("Terhubung ke WebSocket server:", socketIo.id));
    socketIo.on("ordersUpdated", (newOrder: any) => {
      console.log("Pesanan baru diterima:", newOrder);
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

  const confirmPayment = async (orderId: number, paymentMethod: string, paymentId?: string, discountId?: number | null) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          paymentMethod,
          paymentId: paymentMethod !== "tunai" ? paymentId : null,
          discountId: discountId || null,
          status: "Sedang Diproses",
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
    } catch (error) {
      console.error("Error:", error);
      setError("Gagal mengonfirmasi pembayaran. Silakan coba lagi.");
      toast.error("❌ Gagal mengonfirmasi pembayaran");
    } finally {
      setLoading(false);
    }
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

      if (res.ok) {
        toast.success("✅ Pesanan berhasil diselesaikan!");
        fetchOrders();
      } else {
        throw new Error("Gagal menyelesaikan pesanan");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("❌ Terjadi kesalahan saat menyelesaikan pesanan.");
    } finally {
      setLoading(false);
    }
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
    let price = menu.price;
    const activeDiscount = menu.discounts?.find((d) => d.discount.isActive);
    if (activeDiscount) {
      price -=
        activeDiscount.discount.type === "PERCENTAGE"
          ? (activeDiscount.discount.value / 100) * menu.price
          : activeDiscount.discount.value;
    }
    return price > 0 ? price : 0;
  };

  const calculateCartTotals = () => {
    let totalBeforeDiscount = 0;
    let totalDiscountAmount = 0;

    selectedMenuItems.forEach((item) => {
      const originalPrice = item.menu.price * item.quantity;
      const discountedPrice = calculateItemPrice(item.menu) * item.quantity;
      totalBeforeDiscount += originalPrice;
      totalDiscountAmount += originalPrice - discountedPrice;
    });

    const totalAfterDiscount = totalBeforeDiscount - totalDiscountAmount;
    return { totalBeforeDiscount, totalDiscountAmount, totalAfterDiscount };
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
                            setSelectedMenuItems((prev) => {
                              const existing = prev.find((item) => item.menu.id === menu.id);
                              if (existing) {
                                return prev.map((item) =>
                                  item.menu.id === menu.id ? { ...item, quantity: item.quantity + 1 } : item
                                );
                              }
                              return [...prev, { menu, quantity: 1, note: "" }];
                            });
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
                {selectedMenuItems.map((item) => (
                  <div key={item.menu.id} className="flex justify-between items-center mb-3 p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <p className="font-medium">{item.menu.name}</p>
                      <input
                        type="text"
                        placeholder="Catatan..."
                        value={item.note}
                        onChange={(e) => {
                          setSelectedMenuItems((prev) =>
                            prev.map((prevItem) =>
                              prevItem.menu.id === item.menu.id ? { ...prevItem, note: e.target.value } : prevItem
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
                                prevItem.menu.id === item.menu.id
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
                        onClick={() => {
                          setSelectedMenuItems((prev) =>
                            prev.map((prevItem) =>
                              prevItem.menu.id === item.menu.id
                                ? { ...prevItem, quantity: prevItem.quantity + 1 }
                                : prevItem
                            )
                          );
                        }}
                        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 transition"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}

                <div className="mt-4">
                  <div className="text-lg">
                    <p>Subtotal: Rp {calculateCartTotals().totalBeforeDiscount.toLocaleString()}</p>
                    <p>Diskon: Rp {calculateCartTotals().totalDiscountAmount.toLocaleString()}</p>
                    <p className="font-semibold">
                      Total: Rp {calculateCartTotals().totalAfterDiscount.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      (Pajak dan gratuity akan dihitung saat konfirmasi pesanan)
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!tableNumberInput || !customerName) {
                        toast.error("Harap isi nomor meja dan nama pelanggan");
                        return;
                      }

                      try {
                        const { totalBeforeDiscount } = calculateCartTotals();
                        const response = await fetch("/api/placeOrder", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            customerName,
                            tableNumber: tableNumberInput,
                            items: selectedMenuItems.map((item) => ({
                              menuId: item.menu.id,
                              quantity: item.quantity,
                              note: item.note,
                            })),
                            total: totalBeforeDiscount,
                            isCashierOrder: true,
                          }),
                        });

                        if (response.ok) {
                          toast.success("Pesanan berhasil dibuat!");
                          setIsOrderModalOpen(false);
                          setSelectedMenuItems([]);
                          setCustomerName("");
                          setTableNumberInput("");
                          fetchOrders();
                        } else {
                          throw new Error("Gagal membuat pesanan");
                        }
                      } catch (error) {
                        console.error("Error:", error);
                        toast.error("Gagal membuat pesanan");
                      }
                    }}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-md mt-2"
                  >
                    Simpan Pesanan
                  </button>
                </div>
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
  discounts,
}: {
  title: string;
  orders: Order[];
  confirmPayment?: (orderId: number, paymentMethod: string, paymentId?: string, discountId?: number | null) => void;
  markOrderAsCompleted?: (id: number) => void;
  cancelOrder?: (id: number) => void;
  resetTable?: (tableNumber: string) => void;
  discounts?: Discount[];
}) {
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [combinedTotal, setCombinedTotal] = useState<number>(0);
  const [isCombinedPaymentModalOpen, setIsCombinedPaymentModalOpen] = useState<boolean>(false);

  const handleOrderSelection = (orderId: number, isChecked: boolean) => {
    if (isChecked) {
      setSelectedOrders((prev) => [...prev, orderId]);
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        setCombinedTotal((prev) => prev + order.finalTotal);
      }
    } else {
      setSelectedOrders((prev) => prev.filter((id) => id !== orderId));
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        setCombinedTotal((prev) => prev - order.finalTotal);
      }
    }
  };

  const handleCombinedPayment = async (paymentMethod: string, paymentId?: string) => {
    const selectedOrdersData = orders.filter((order) => selectedOrders.includes(Number(order.id)));
    if (confirmPayment) {
      for (const order of selectedOrdersData) {
        await confirmPayment(Number(order.id), paymentMethod, paymentId, order.discountId);
      }
    }

    const combinedOrder: Order = {
      id: selectedOrdersData.map((o) => o.id).join("-"),
      customerName: "Gabungan Pesanan",
      tableNumber: selectedOrdersData.map((o) => o.tableNumber).join(", "),
      total: selectedOrdersData.reduce((acc, order) => acc + order.total, 0),
      discountAmount: selectedOrdersData.reduce((acc, order) => acc + order.discountAmount, 0),
      taxAmount: selectedOrdersData.reduce((acc, order) => acc + order.taxAmount, 0),
      gratuityAmount: selectedOrdersData.reduce((acc, order) => acc + order.gratuityAmount, 0),
      finalTotal: selectedOrdersData.reduce((acc, order) => acc + order.finalTotal, 0),
      paymentMethod,
      orderItems: selectedOrdersData.flatMap((o) => o.orderItems),
      createdAt: new Date().toISOString(),
      status: "Sedang Diproses",
    };

    generateCombinedPDF(combinedOrder);
    setSelectedOrders([]);
    setCombinedTotal(0);
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
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {selectedOrders.length > 0 && (
        <div className="mt-4">
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
          onConfirmPayment={handleCombinedPayment}
          onCancel={() => {
            setSelectedOrders([]);
            setCombinedTotal(0);
            setIsCombinedPaymentModalOpen(false);
          }}
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
}: {
  order: Order;
  confirmPayment?: (orderId: number, paymentMethod: string, paymentId?: string, discountId?: number | null) => void;
  markOrderAsCompleted?: (id: number) => void;
  cancelOrder?: (id: number) => void;
  onSelectOrder?: (orderId: number, isChecked: boolean) => void;
  isSelected?: boolean;
  discounts: Discount[];
})  {
  const [paymentMethod, setPaymentMethod] = useState<string>("tunai");
  const [paymentId, setPaymentId] = useState<string>("");
  const [cashGiven, setCashGiven] = useState<string>("");
  const [change, setChange] = useState<number>(0);
  const [confirmation, setConfirmation] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [selectedDiscountId, setSelectedDiscountId] = useState<number | null>(order.discountId || null);

  // State untuk perhitungan lokal
  const [localDiscountAmount, setLocalDiscountAmount] = useState<number>(order.discountAmount);
  const [localFinalTotal, setLocalFinalTotal] = useState<number>(order.finalTotal);

  // Fungsi untuk menghitung ulang total berdasarkan diskon yang dipilih
  const calculateTotals = (discountId: number | null) => {
    // Hitung total awal termasuk pajak dan gratuity
    const menuDiscountAmount = order.orderItems.reduce((sum, item) => sum + item.discountAmount, 0);
    const totalAfterMenuDiscount = order.total - menuDiscountAmount;
    const initialFinalTotal = totalAfterMenuDiscount + order.taxAmount + order.gratuityAmount;

    // Hitung total diskon termasuk scope TOTAL
    let totalDiscountAmount = menuDiscountAmount;
    if (discountId) {
      const selectedDiscount = discounts.find((d) => d.id === discountId);
      if (selectedDiscount) {
        const additionalDiscount =
          selectedDiscount.type === "PERCENTAGE"
            ? (selectedDiscount.value / 100) * initialFinalTotal
            : selectedDiscount.value;
        totalDiscountAmount += additionalDiscount;
      }
    }

    // Batasi totalDiscountAmount agar tidak melebihi initialFinalTotal
    totalDiscountAmount = Math.min(totalDiscountAmount, initialFinalTotal);
    const finalTotal = initialFinalTotal - totalDiscountAmount;

    setLocalDiscountAmount(totalDiscountAmount);
    setLocalFinalTotal(finalTotal >= 0 ? finalTotal : 0);
  };

  useEffect(() => {
    calculateTotals(selectedDiscountId);
  }, [selectedDiscountId, order]);

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

  return (
    <div className="bg-[#FF8A00] p-3 rounded-lg">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-sm font-medium">Order ID: {order.id}</h4>
          <p className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 px-4 py-2 rounded shadow-md">
            Customer: {order.customerName}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="mt-2 text-gray-700">
        <p>Subtotal: <span className="font-semibold">Rp {order.total.toLocaleString()}</span></p>
        <p>Diskon: <span className="font-semibold">Rp {localDiscountAmount.toLocaleString()}</span></p>
        <p>Pajak: <span className="font-semibold">Rp {order.taxAmount.toLocaleString()}</span></p>
        <p>Gratuity: <span className="font-semibold">Rp {order.gratuityAmount.toLocaleString()}</span></p>
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
            </span>
          </li>
        ))}
      </ul>

      {order.status === "pending" && confirmPayment && (
        <div className="mt-4 space-y-2">
          <select
            value={selectedDiscountId || ""}
            onChange={(e) => setSelectedDiscountId(e.target.value ? Number(e.target.value) : null)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="">Tidak ada diskon</option>
            {discounts.map((discount) => (
              <option key={discount.id} value={discount.id}>
                {discount.name} ({discount.type === "PERCENTAGE" ? `${discount.value}%` : `Rp${discount.value}`})
              </option>
            ))}
          </select>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="tunai">Tunai</option>
            <option value="kartu">Kartu Kredit/Debit</option>
            <option value="e-wallet">E-Wallet</option>
          </select>
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
            onClick={() => {
              if (paymentMethod === "tunai") {
                const given = parseFloat(cashGiven) || 0;
                if (given < localFinalTotal) {
                  toast.error("Uang yang diberikan kurang");
                  return;
                }
              }
              confirmPayment(Number(order.id), paymentMethod, paymentId, selectedDiscountId);
            }}
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
        <div className="space-y-2">
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
        <div className="space-y-2">
          <button
            onClick={() => generatePDF(order)}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md transition"
          >
            🖨️ Cetak Struk
          </button>
        </div>
      )}

      {onSelectOrder && order.status === "pending" && (
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

function generatePDF(order: Order) {
  const margin = 5;
  const pageWidth = 58;
  const doc = new jsPDF({
    unit: "mm",
    format: [pageWidth, 200],
  });

  let yPosition = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Cafe Kita", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 6;

  doc.setLineWidth(0.3);
  doc.setDrawColor(150);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 3;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const now = new Date();
  const tanggal = now.toLocaleDateString();
  const hari = now.toLocaleDateString("id-ID", { weekday: "long" });
  const jam = now.toLocaleTimeString();

  doc.text(`Tanggal : ${tanggal}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Hari    : ${hari}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Jam     : ${jam}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Kasir  : Kasir 1`, margin, yPosition);
  yPosition += 5;
  doc.text(`Meja   : ${order.tableNumber}`, margin, yPosition);
  yPosition += 7;

  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 3;

  doc.setFont("helvetica", "bold");
  doc.text("Pesanan", margin, yPosition);
  yPosition += 5;
  doc.setFont("helvetica", "normal");
  doc.text("Item", margin, yPosition);
  doc.text("Total", pageWidth - margin, yPosition, { align: "right" });
  yPosition += 5;
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 3;

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
    doc.text(firstLine, margin, yPosition);
    if (secondLine) {
      yPosition += 5;
      doc.text(secondLine, margin, yPosition);
    }
    yPosition += 5;

    const itemPriceAfterDiscount = item.price - (item.discountAmount / item.quantity);
    doc.text(`${item.quantity} x ${itemPriceAfterDiscount.toLocaleString()}`, margin, yPosition);
    const itemTotal = itemPriceAfterDiscount * item.quantity;
    doc.text(`Rp ${itemTotal.toLocaleString()}`, pageWidth - margin, yPosition, { align: "right" });
    yPosition += 5;

    if (yPosition > 180) {
      doc.addPage();
      yPosition = margin;
    }
  });

  yPosition += 3;
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  doc.setFont("helvetica", "bold");
  const totalQty = order.orderItems.reduce((acc, item) => acc + item.quantity, 0);
  doc.text(`Total qty = ${totalQty}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Subtotal: Rp ${order.total.toLocaleString()}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Diskon: Rp ${order.discountAmount.toLocaleString()}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Pajak: Rp ${order.taxAmount.toLocaleString()}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Gratuity: Rp ${order.gratuityAmount.toLocaleString()}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Total Bayar: Rp ${order.finalTotal.toLocaleString()}`, margin, yPosition);
  yPosition += 7;

  doc.setFont("helvetica", "normal");
  doc.text(`Pembayaran: ${order.paymentMethod || "-"}`, margin, yPosition);
  yPosition += 7;

  doc.setFont("helvetica", "italic");
  doc.text("Terimakasih telah berkunjung!", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 5;
  doc.text("Semoga hari Anda menyenangkan!", pageWidth / 2, yPosition, { align: "center" });

  doc.save(`struk_order_${order.id}.pdf`);
}

function generateCombinedPDF(order: Order) {
  const margin = 5;
  const pageWidth = 58;
  const doc = new jsPDF({
    unit: "mm",
    format: [pageWidth, 250],
  });

  let yPosition = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Cafe Kita", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 6;
  doc.setFontSize(9);
  doc.text("Struk Gabungan Pesanan", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 6;

  doc.setLineWidth(0.3);
  doc.setDrawColor(150);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 3;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const now = new Date();
  const tanggal = now.toLocaleDateString();
  const hari = now.toLocaleDateString("id-ID", { weekday: "long" });
  const jam = now.toLocaleTimeString();

  doc.text(`Tanggal : ${tanggal}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Hari    : ${hari}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Jam     : ${jam}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Kasir  : Kasir 1`, margin, yPosition);
  yPosition += 5;
  doc.text(`Meja   : ${order.tableNumber}`, margin, yPosition);
  yPosition += 7;

  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 3;

  doc.setFont("helvetica", "bold");
  doc.text("Pesanan", margin, yPosition);
  yPosition += 5;
  doc.setFont("helvetica", "normal");
  doc.text("Item", margin, yPosition);
  doc.text("Total", pageWidth - margin, yPosition, { align: "right" });
  yPosition += 5;
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 3;

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
    doc.text(firstLine, margin, yPosition);
    if (secondLine) {
      yPosition += 5;
      doc.text(secondLine, margin, yPosition);
    }
    yPosition += 5;
    const itemPriceAfterDiscount = item.price - (item.discountAmount / item.quantity);
    doc.text(`${item.quantity} x ${itemPriceAfterDiscount.toLocaleString()}`, margin, yPosition);
    const itemTotal = itemPriceAfterDiscount * item.quantity;
    doc.text(`Rp ${itemTotal.toLocaleString()}`, pageWidth - margin, yPosition, { align: "right" });
    yPosition += 5;
    if (yPosition > 230) {
      doc.addPage();
      yPosition = margin;
    }
  });

  yPosition += 3;
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  doc.setFont("helvetica", "bold");
  const totalQty = order.orderItems.reduce((acc, item) => acc + item.quantity, 0);
  doc.text(`Total qty = ${totalQty}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Subtotal: Rp ${order.total.toLocaleString()}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Diskon: Rp ${order.discountAmount.toLocaleString()}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Pajak: Rp ${order.taxAmount.toLocaleString()}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Gratuity: Rp ${order.gratuityAmount.toLocaleString()}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Total Bayar: Rp ${order.finalTotal.toLocaleString()}`, margin, yPosition);
  yPosition += 7;

  doc.setFont("helvetica", "normal");
  doc.text(`Pembayaran: ${order.paymentMethod || "-"}`, margin, yPosition);
  yPosition += 7;

  doc.setFont("helvetica", "italic");
  doc.text("Terimakasih telah berkunjung!", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 5;
  doc.text("Semoga hari Anda menyenangkan!", pageWidth / 2, yPosition, { align: "center" });

  doc.save(`struk_gabungan_${order.id}.pdf`);
}