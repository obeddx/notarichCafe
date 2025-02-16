"use client";
import { useEffect, useState } from "react";
import SidebarCashier from "@/components/sidebarCashier";

interface CompletedOrder {
  id: number;
  tableNumber: string;
  total: number;
  paymentMethod?: string;
  paymentId?: string;
  createdAt: string;
  orderItems: {
    id: number;
    menuName: string;
    quantity: number;
    note?: string;
  }[];
}

export default function HistoryPage() {
  const [completedOrders, setCompletedOrders] = useState<CompletedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // State untuk sidebar

  useEffect(() => {
    fetchCompletedOrders();
  }, []);

  const fetchCompletedOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/completedOrders");
      if (!response.ok) throw new Error("Gagal mengambil data riwayat pesanan");

      const data = await response.json();
      setCompletedOrders(
        data.orders.map((order: any) => ({
          ...order,
          orderItems: order.orderItems.map((item: any) => ({
            id: item.id,
            menuName: item.menu.name,
            quantity: item.quantity,
            note: item.note,
          })),
        }))
      );
    } catch (error) {
      console.error("Error fetching history:", error);
      setError("Gagal memuat data riwayat. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex">
      {/* Sidebar */}
      <div className={`h-full fixed transition-all duration-300 ${isSidebarOpen ? "w-64" : "w-20"}`}>
        <SidebarCashier isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      </div>

      {/* Konten Utama */}
      <div
        className={`flex-1 p-6 transition-all duration-300 ${
          isSidebarOpen ? "ml-64" : "ml-20"
        }`}
      >
        <h1 className="text-2xl font-bold mb-4">Riwayat Pesanan</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {loading ? (
          <p>Memuat data riwayat pesanan...</p>
        ) : (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-2">Nomor Meja</th>
                <th className="border p-2">Total Harga</th>
                <th className="border p-2">Metode Pembayaran</th>
                <th className="border p-2">Pesanan</th>
                <th className="border p-2">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {completedOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-4 text-gray-500">
                    Tidak ada riwayat pesanan.
                  </td>
                </tr>
              ) : (
                completedOrders.map((order) => (
                  <tr key={order.id} className="border">
                    <td className="border p-2">{order.tableNumber}</td>
                    <td className="border p-2">Rp {order.total.toLocaleString()}</td>
                    <td className="border p-2">{order.paymentMethod || "Tunai"}</td>
                    <td className="border p-2">
                      <ul>
                        {order.orderItems.map((item) => (
                          <li key={item.id}>
                            {item.menuName} - {item.quantity} pcs {item.note && `(${item.note})`}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="border p-2">{new Date(order.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}