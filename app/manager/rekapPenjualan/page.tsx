"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import SalesChart from "@/components/SalesChart";
import PaymentMethodPieChart from "@/components/PaymentMethodPieChart";
import RevenueByCategoryChart from "@/components/RevenueByCategoryChart";

export default function RekapPenjualan() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [salesData, setSalesData] = useState<any[]>([]);

  useEffect(() => {
    if (startDate || endDate) {
      fetchSalesData();
    }
  }, [startDate, endDate]);

  const fetchSalesData = async () => {
    setSalesData([]); // Kosongkan tabel sebelum fetch data baru

    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate.toISOString().split("T")[0]);
    if (endDate) params.append("endDate", endDate.toISOString().split("T")[0]);

    console.log("📅 Fetching with params:", params.toString());

    try {
      const response = await fetch(`/api/completedOrdersByDate?${params.toString()}`);
      const data = await response.json();

      console.log("📊 Data dari API:", data);
      setSalesData(data.orders);
    } catch (error) {
      console.error("❌ Error fetching sales data:", error);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#FFFAF0]">
      <Sidebar onToggle={setSidebarOpen} isOpen={sidebarOpen} />
      <div className={`flex-1 p-4 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        <h1 className="text-3xl md:text-4xl font-bold text-[#212121] mb-4">Rekap Penjualan</h1>

        {/* Filter Tanggal */}
        <div className="flex items-end gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium">Tanggal Mulai:</label>
            <DatePicker selected={startDate} onChange={(date) => setStartDate(date)} className="border p-2 rounded w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium">Tanggal Akhir:</label>
            <DatePicker selected={endDate} onChange={(date) => setEndDate(date)} className="border p-2 rounded w-full" />
          </div>
          <button
            onClick={() => {
              setStartDate(null);
              setEndDate(null);
              setSalesData([]); // Reset tabel penjualan
            }}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition self-end"
          >
            Reset
          </button>
        </div>

        {/* Tabel Penjualan */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-3">Daftar Penjualan</h2>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">No</th>
                <th className="border p-2">Nomor Meja</th>
                <th className="border p-2">Total</th>
                <th className="border p-2">Metode Pembayaran</th>
                <th className="border p-2">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {salesData.length > 0 ? (
                salesData.map((order, index) => (
                  <tr key={order.id} className="text-center">
                    <td className="border p-2">{index + 1}</td>
                    <td className="border p-2">{order.tableNumber || "N/A"}</td>
                    <td className="border p-2">Rp {order.total?.toLocaleString() || "0"}</td>
                    <td className="border p-2">{order.paymentMethod || "N/A"}</td>
                    <td className="border p-2">{new Date(order.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center p-4 text-gray-500">
                    Tidak ada data penjualan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Chart Analisis */}
        <div className="mt-6 space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <SalesChart />
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <PaymentMethodPieChart />
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <RevenueByCategoryChart />
          </div>
        </div>
      </div>
    </div>
  );
}
