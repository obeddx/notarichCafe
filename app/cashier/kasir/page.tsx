"use client";

import { useEffect, useState } from "react";
import SidebarCashier from "@/components/sidebarCashier";

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
  tableNumber: string;
  total: number;
  status: string;
  paymentMethod?: string;
  paymentId?: string;
  createdAt: string;
  orderItems: OrderItem[];
}

export default function KasirPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

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
        }),
      });

      if (res.ok) {
        fetchOrders(); // Refresh daftar pesanan setelah pembayaran dikonfirmasi
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
        alert("✅ Pesanan berhasil diselesaikan!");
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === orderId ? { ...order, status: "Selesai" } : order
          )
        );
      } else {
        throw new Error("Gagal menyelesaikan pesanan");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Gagal menyelesaikan pesanan. Silakan coba lagi.");
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
        alert("✅ Pesanan berhasil dibatalkan!");
        setOrders((prevOrders) => prevOrders.filter((order) => order.id !== orderId));
      } else {
        throw new Error("Gagal membatalkan pesanan");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Gagal membatalkan pesanan. Silakan coba lagi.");
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tableNumber }),
      });

      if (res.ok) {
        alert(`✅ Meja ${tableNumber} berhasil direset!`);
        fetchOrders(); // Refresh daftar pesanan setelah meja direset
      } else {
        throw new Error("Gagal mereset meja");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Gagal mereset meja. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const activeOrders = orders.filter((order) => order.status !== "Selesai");
  const completedOrders = orders.filter((order) => order.status === "Selesai");

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 fixed h-full">
        <SidebarCashier />
      </div>

      {/* Konten utama */}
      <div className="flex-1 ml-64 p-6 bg-gray-100 min-h-screen overflow-auto">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          💳 Halaman Kasir
        </h1>

        {error && <p className="text-red-500 text-center">{error}</p>}
        {loading ? (
          <p className="text-center text-gray-500">Memuat data pesanan...</p>
        ) : (
          <div className="max-w-6xl mx-auto space-y-8">
            <OrderSection
              title="📌 Pesanan Aktif"
              orders={activeOrders}
              confirmPayment={confirmPayment}
              markOrderAsCompleted={markOrderAsCompleted}
              cancelOrder={cancelOrder}
            />
            <OrderSection
              title="✅ Pesanan Selesai"
              orders={completedOrders}
              resetTable={resetTable}
            />
          </div>
        )}
      </div>
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
}) {
  // Kelompokkan pesanan berdasarkan tableNumber
  const groupedOrders = orders.reduce((acc, order) => {
    if (!acc[order.tableNumber]) {
      acc[order.tableNumber] = [];
    }
    acc[order.tableNumber].push(order);
    return acc;
  }, {} as { [key: string]: Order[] });

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
                    🧹 Reset Meja
                  </button>
                )}
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {tableOrders.map((order) => (
                  <OrderItemComponent
                    key={order.id}
                    order={order}
                    confirmPayment={confirmPayment}
                    markOrderAsCompleted={markOrderAsCompleted}
                    cancelOrder={cancelOrder}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OrderItemComponent({
  order,
  confirmPayment,
  markOrderAsCompleted,
  cancelOrder,
}: {
  order: Order;
  confirmPayment?: (orderId: number, paymentMethod: string, paymentId?: string) => void;
  markOrderAsCompleted?: (id: number) => void;
  cancelOrder?: (id: number) => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<string>("tunai");
  const [paymentId, setPaymentId] = useState<string>("");

  return (
    <div className="bg-gray-50 p-3 rounded-lg">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium">Order ID: {order.id}</h4>
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
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md transition"
          >
            💰 Konfirmasi Pembayaran
          </button>
          <button
            onClick={() => cancelOrder && cancelOrder(order.id)}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-md transition"
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
            className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-md transition"
          >
            ✅ Tandai Selesai
          </button>
          <button
            onClick={() => cancelOrder && cancelOrder(order.id)}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-md transition"
          >
            ❌ Batal Pesanan
          </button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let color = "bg-gray-500";
  if (status === "pending") color = "bg-yellow-500";
  if (status === "Sedang Diproses") color = "bg-blue-500";
  if (status === "Selesai") color = "bg-green-500";

  return (
    <span className={`px-3 py-1 text-white text-sm rounded-full ${color}`}>
      {status}
    </span>
  );
}