"use client";

import { useState, useEffect, ChangeEvent } from "react";
import Sidebar from "@/components/sidebar";

interface GudangStock {
  date: string;
  gudangId: number;
  gudangName: string;
  start: number;
  stockIn: number;
  used: number;
  wasted: number;
  stock: number;
  stockMin: number;
}

const RekapStokGudang = () => {
  const [date, setDate] = useState<string>("");
  const [data, setData] = useState<GudangStock[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  const fetchData = async (selectedDate: string) => {
    try {
      const res = await fetch(`/api/dailygudangstock?date=${selectedDate}`);
      if (!res.ok) {
        throw new Error("Error fetching data");
      }
      const json: GudangStock[] = await res.json();
      setData(json);
    } catch (error) {
      console.error("Error:", error);
      setData([]);
    }
  };

  const handleSearch = () => {
    if (date) {
      fetchData(date);
    }
  };

  const resetStock = async () => {
    try {
      const res = await fetch("/api/resetDailyStockGudang", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Gagal mereset stok gudang");
      const result = await res.json();
      alert(result.message);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const formattedDate =
    data.length > 0
      ? new Date(data[0].date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        })
      : "";

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="p-4 mt-[85px] transition-all" style={{ marginLeft: isSidebarOpen ? "256px" : "80px" }}>
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-3xl font-bold text-center mb-6 text-blue-600">Rekap Stok Gudang</h1>
        <Sidebar onToggle={toggleSidebar} isOpen={isSidebarOpen} />

        <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <label htmlFor="date" className="font-medium text-gray-700">
              Tanggal:
            </label>
            <input type="date" id="date" value={date} onChange={(e: ChangeEvent<HTMLInputElement>) => setDate(e.target.value)} className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-400" />
            <button onClick={handleSearch} className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded shadow">
              Cari
            </button>
          </div>
          <button onClick={resetStock} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow">
            Reset Stok Harian
          </button>
        </div>

        {data.length > 0 ? (
          <>
            <div className="mb-4 text-center text-lg font-semibold text-gray-800">Tanggal: {formattedDate}</div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Nama Gudang</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Start</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Stock Masuk</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Terpakai</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Terbuang</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Sisa Stok</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Stok Minimum</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((gudang, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{gudang.gudangId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{gudang.gudangName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{gudang.start}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{gudang.stockIn}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{gudang.used}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{gudang.wasted}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{gudang.stock}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{gudang.stockMin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-center text-gray-600">Tidak ada data untuk tanggal yang dipilih.</p>
        )}
      </div>
    </div>
  );
};

export default RekapStokGudang;
