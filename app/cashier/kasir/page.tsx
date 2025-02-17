"use client";

import { useEffect, useState } from "react";
import SidebarCashier from "@/components/sidebarCashier";
import toast, { Toaster } from "react-hot-toast";
import { FiBell } from "react-icons/fi";
import { AlertTriangle } from "lucide-react";
import { useNotifications, MyNotification } from "../../contexts/NotificationContext";

interface Menu {
  id: number;
  name: string;
  description?: string;
  image: string;
  price: number;
  category: string;
  Status: string;
}

interface OrderItem {
  id: number;
  menuId: number;
  quantity: number;
  note?: string;
  menu: Menu;
}

interface Order {
  id: number;
  customerName: string; // Tambahkan field
  tableNumber: string;
  total: number;
  status: string;
  paymentMethod?: string;
  paymentId?: string;
  createdAt: string;
  orderItems: OrderItem[];
}

interface Ingredient {
  id: number;
  name: string;
  stock: number;
  unit: string;
}

export default function KasirPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [actualStocks, setActualStocks] = useState<Record<number, number>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const { notifications, setNotifications } = useNotifications();
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // State untuk sidebar
  const [, setSelectedOrders] = useState<number[]>([]);

  useEffect(() => {
    fetchOrders();
  }, []);
// Define groupedOrders before using it


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

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const confirmPayment = async (orderId: number, paymentMethod: string, paymentId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          paymentMethod,
          paymentId: paymentMethod !== "tunai" ? paymentId : null,
          status: "Sedang Diproses", // Ubah status menjadi "Sedang Diproses"
        }),
      });
  
      if (res.ok) {
        fetchOrders();
      } else {
        throw new Error("Gagal mengonfirmasi pembayaran");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Gagal mengonfirmasi pembayaran. Silakan coba lagi.");
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
        headers: {
          "Content-Type": "application/json",
        },
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
 // Hitung total gabungan
 

// Fungsi handle select order
const handleSelectOrder = (orderId: number) => {
 setSelectedOrders(prev => 
   prev.includes(orderId) 
     ? prev.filter(id => id !== orderId) 
     : [...prev, orderId]
 );
};

// Fungsi gabungkan pesanan

const resetTable = async (tableNumber: string) => {
  setLoading(true);
  setError(null);
  try {
    const res = await fetch(`/api/resetTable`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
        newNotifs.push({ message, date });
        toast.success("Berhasil Validasi Stock Nyata", { position: "top-right" });
        toast.error(message, { position: "top-right" });
      }
    });
    if (newNotifs.length > 0) {
      setNotifications([...notifications, ...newNotifs]);
    }
    setModalOpen(false);
  };
  return (
    <div className="flex min-h-screen bg-gradient-to-b from-[#FFFAF0] to-[#FFE4C4]">
      {/* Sidebar */}
      <div className={`h-full fixed transition-all duration-300 ${isSidebarOpen ? "w-64" : "w-20"}`}>
        <SidebarCashier isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      </div>

      {/* Konten utama */}
      <div className={`flex-1 p-6 transition-all duration-300 ${isSidebarOpen ? "ml-64" : "ml-20"}`}>
        <Toaster />
        <h1 className="text-3xl font-bold text-center mb-6 text-[#0E0E0E]">
          💳 Halaman Kasir
        </h1>
        <div className="flex items-center gap-4">
            <button onClick={() => setNotificationModalOpen(true)} className="relative">
              <FiBell className="text-3xl text-[#FF8A00]" />
              {/* Notification badge... */}
            </button>
          </div>

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
              onSelectOrder={handleSelectOrder} // Tambahkan prop ini
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
      </div>

      {/* Modal Input Stock */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="relative bg-white p-8 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-y-auto">
          {/* Tombol Tutup */}
          <button
            onClick={() => setModalOpen(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      {/* Modal Notifikasi */}
      {notificationModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-[#FCFFFC] p-6 rounded shadow-md w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-[#0E0E0E]">Notifications</h2>
            {notifications.length === 0 ? (
              <p className="text-[#0E0E0E]">Tidak ada notifikasi</p>
            ) : (
              <ul className="space-y-2">
                {notifications.map((notif, idx) => (
                  <li key={idx} className="border-b border-[#92700C] pb-2">
                    <p className="text-[#0E0E0E]">{notif.message}</p>
                    <p className="text-xs text-[#979797]">{notif.date}</p>
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
  );
}


function OrderSection({
  title,
  orders,
  confirmPayment,
  markOrderAsCompleted,
  cancelOrder,
  resetTable,
}: {
  title: string;
  orders: Order[];
  confirmPayment?: (orderId: number, paymentMethod: string, paymentId?: string) => void;
  markOrderAsCompleted?: (id: number) => void;
  cancelOrder?: (id: number) => void;
  resetTable?: (tableNumber: string) => void;
  onSelectOrder?: (orderId: number, isChecked: boolean) => void;
  selectedOrders?: number[]; 
  isSelected?: boolean;
}) {
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [combinedTotal, setCombinedTotal] = useState<number>(0);

  const handleOrderSelection = (orderId: number, isChecked: boolean) => {
    if (isChecked) {
      setSelectedOrders((prev) => [...prev, orderId]);
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        setCombinedTotal((prev) => prev + order.total);
      }
    } else {
      setSelectedOrders((prev) => prev.filter((id) => id !== orderId));
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        setCombinedTotal((prev) => prev - order.total);
      }
    }
  };

  const handleCombinedPayment = async (paymentMethod: string, paymentId?: string) => {
    if (confirmPayment) {
      for (const orderId of selectedOrders) {
        await confirmPayment(orderId, paymentMethod, paymentId);
      }
      setSelectedOrders([]);
      setCombinedTotal(0);
    }
  };

  // Define groupedOrders
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
                {resetTable && (
                  <button
                    onClick={() => resetTable(tableNumber)}
                    className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-md transition"
                  >
                    � Reset Meja
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
                    isSelected={selectedOrders.includes(order.id)}
                  />
                ))}

              </div>
            </div>
          ))}
        </div>
      )}
      <div>
{selectedOrders.length > 0 && (
  <div className="bg-white shadow-md rounded-lg p-4">
    <h3 className="text-lg font-semibold">Gabungan Pesanan</h3>
    <p className="text-gray-700 mt-2">
      Total: <span className="font-semibold">Rp {combinedTotal.toLocaleString()}</span>
    </p>
    <CombinedPaymentForm
      onConfirmPayment={handleCombinedPayment}
      onCancel={() => {
        setSelectedOrders([]);
        setCombinedTotal(0);
      }}
    />
  </div>
)}
</div>
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
}: {
  order: Order;
  confirmPayment?: (orderId: number, paymentMethod: string, paymentId?: string) => void;
  markOrderAsCompleted?: (id: number) => void;
  cancelOrder?: (id: number) => void;
  onSelectOrder?: (orderId: number, isChecked: boolean) => void;
  isSelected?: boolean;
}) {
  const [paymentMethod, setPaymentMethod] = useState<string>("tunai");
  const [paymentId, setPaymentId] = useState<string>("");

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
      <p className="text-gray-700 mt-2">Total: <span className="font-semibold">Rp {order.total.toLocaleString()}</span></p>
      <ul className="mt-3 space-y-1">
        {order.orderItems.map((item) => (
          <li key={item.id} className="flex items-center space-x-2">
            <img src={item.menu.image} alt={item.menu.name} className="w-8 h-8 object-cover rounded" />
            <span>{item.menu.name} - {item.quantity} pcs</span>
          </li>
        ))}
      </ul>

      {/* Tombol untuk pesanan berstatus "pending" */}
      {order.status === "pending" && confirmPayment && (
        <div className="mt-4 space-y-2">
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
          <button
            onClick={() => confirmPayment(order.id, paymentMethod, paymentId)}
            className="w-full bg-[#4CAF50] hover:bg-[#45a049] text-white py-2 rounded-md transition"
          >
            💰 Konfirmasi Pembayaran
          </button>
          <button
            onClick={() => cancelOrder && cancelOrder(order.id)}
            className="w-full bg-[#8A4210] hover:bg-[#975F2C] text-white py-2 rounded-md transition"
          >
            ❌ Batal Pesanan
          </button>
        </div>
      )}

      {/* Tombol untuk pesanan berstatus "Sedang Diproses" */}
      {order.status === "Sedang Diproses" && markOrderAsCompleted && (
        <div className="space-y-2">
          <button
            onClick={() => markOrderAsCompleted(order.id)}
            className="w-full bg-[#4CAF50] hover:bg-[#45a049] text-white py-2 rounded-md transition"
          >
            ✅ Tandai Selesai
          </button>
          <button
            onClick={() => cancelOrder && cancelOrder(order.id)}
            className="w-full bg-[#8A4210] hover:bg-[#975F2C] text-white py-2 rounded-md transition"
          >
            ❌ Batal Pesanan
          </button>
        </div>
      )}
{onSelectOrder && order.status === 'pending' && (
  <div className="mt-2">
    <input
      type="checkbox"
      checked={isSelected}
      onChange={(e) => onSelectOrder(order.id, e.target.checked)}
     className="mr-2 w-6 h-6"
    />
    <span className="text-sm">Pilih untuk merge</span>
  </div>
)}
    </div>
  );
}
function CombinedPaymentForm({
  onConfirmPayment,
  onCancel,
}: {
  onConfirmPayment: (paymentMethod: string, paymentId?: string) => void;
  onCancel: () => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<string>("tunai");
  const [paymentId, setPaymentId] = useState<string>("");

  return (
    <div className="mt-4 space-y-2">
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
      <button
        onClick={() => onConfirmPayment(paymentMethod, paymentId)}
        className="w-full bg-[#4CAF50] hover:bg-[#45a049] text-white py-2 rounded-md transition"
      >
        💰 Konfirmasi Pembayaran Gabungan
      </button>
      <button
        onClick={onCancel}
        className="w-full bg-[#8A4210] hover:bg-[#975F2C] text-white py-2 rounded-md transition"
      >
        ❌ Batalkan Gabungan
      </button>
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