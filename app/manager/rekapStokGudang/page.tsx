"use client";

import { useState, ChangeEvent } from "react";
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
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [data, setData] = useState<GudangStock[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  const fetchData = async (start: string, end?: string) => {
    try {
      const url = end ? `/api/dailygudangstock?start=${start}&end=${end}` : `/api/dailygudangstock?date=${start}`;
      const res = await fetch(url);
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
    if (startDate && !endDate) {
      fetchData(startDate);
    } else if (startDate && endDate) {
      fetchData(startDate, endDate);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  };

  const formattedDate = data.length > 0 ? (endDate ? `${formatDate(startDate)} - ${formatDate(endDate)}` : `${formatDate(startDate)}`) : "";

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="p-4 mt-[85px] transition-all" style={{ marginLeft: isSidebarOpen ? "256px" : "80px" }}>
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-3xl font-bold text-center mb-6 text-blue-600">Rekap Stok Gudang</h1>
        <Sidebar onToggle={toggleSidebar} isOpen={isSidebarOpen} />

        {/* Input tanggal */}
        <div className="flex justify-center mb-6 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <label htmlFor="start-date" className="font-medium text-gray-700">
              Tanggal:
            </label>
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="end-date" className="font-medium text-gray-700">
              Sampai (Opsional):
            </label>
            <input
              type="date"
              id="end-date"
              value={endDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-400"
              disabled={!startDate}
            />
          </div>

          <button onClick={handleSearch} className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded shadow">
            Cari
          </button>
        </div>

        {data.length > 0 ? (
          <>
            <div className="mb-4 text-center text-lg font-semibold text-gray-800">Periode: {formattedDate}</div>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-center text-gray-600">Tidak ada data dalam periode yang dipilih.</p>
        )}
      </div>
    </div>
  );
};

export default RekapStokGudang;
