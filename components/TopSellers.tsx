// File: components/TopSellers.tsx
"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

const COLORS = ["#FF8A00", "#975F2C", "#8A4210", "#92700C", "#212121"];

export default function TopSellers() {
  // Data top seller
  const [topSellers, setTopSellers] = useState<{ menuName: string; totalSold: number }[]>([]);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");
  const [date, setDate] = useState("");

  useEffect(() => {
    async function fetchTopSellers() {
      try {
        let url = `/api/topSellers?period=${period}`;
        if (date) {
          // Gunakan tanggal tunggal sebagai filter
          url += `&date=${date}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        setTopSellers(data.topSellers);
      } catch (error) {
        console.error("Error fetching top sellers:", error);
      }
    }
    fetchTopSellers();
  }, [period, date]);

  // Fungsi ekspor ke PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const title = "Laporan Top Sellers";
    const headers = [["Menu", "Total Terjual"]];
    const tableData = topSellers.map((item) => [item.menuName, item.totalSold]);

    doc.setFontSize(16);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    if (topSellers.length > 0) {
      doc.text(
        `Menu Terlaris: ${topSellers[0].menuName} (${topSellers[0].totalSold} terjual)`,
        14,
        28
      );
    }
    (doc as any).autoTable({
      head: headers,
      body: tableData,
      startY: 34,
      theme: "striped",
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: "#FF8A00" },
    });
    doc.save("laporan_top_sellers.pdf");
  };

  // Fungsi ekspor ke Excel
  const exportToExcel = () => {
    const dataForExcel = topSellers.map((item) => ({
      Menu: item.menuName,
      "Total Terjual": item.totalSold,
    }));
    const summary = [
      {
        Menu: "Menu Terlaris",
        "Total Terjual": `${topSellers[0]?.menuName || "-"} (${topSellers[0]?.totalSold || 0} terjual)`,
      },
    ];
    const finalData = [...dataForExcel, ...summary];
    const worksheet = XLSX.utils.json_to_sheet(finalData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Top Sellers");
    XLSX.writeFile(workbook, "laporan_top_sellers.xlsx");
  };

  return (
    <div className="p-3 bg-gray-50 rounded-lg shadow min-h-[350px] w-full">
      <h2 className="text-xl font-semibold text-[#8A4210] mb-3">📊 Produk Terlaris</h2>

      {/* Dropdown Pilihan Periode */}
      <div className="mb-3 flex flex-col sm:flex-row sm:items-center gap-2">
        <label htmlFor="period" className="text-sm text-gray-700 font-medium">Periode:</label>
        <select
          id="period"
          value={period}
          onChange={(e) =>
            setPeriod(e.target.value as "daily" | "weekly" | "monthly" | "yearly")
          }
          className="p-1 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8A00]"
        >
          <option value="daily">Harian</option>
          <option value="weekly">Mingguan</option>
          <option value="monthly">Bulanan</option>
          <option value="yearly">Tahunan</option>
        </select>
      </div>

      {/* Input Tanggal */}
      <div className="mb-3 flex items-center gap-2">
        <label className="text-sm text-gray-700 font-medium">Tanggal:</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="p-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF8A00]"
        />
      </div>

      {/* Tombol Ekspor */}
      <div className="mb-3 flex gap-2">
        <button
          onClick={exportToPDF}
          className="px-3 py-1 bg-[#FF8A00] text-white text-sm rounded hover:bg-[#FF6F00] transition-all"
        >
          Ekspor PDF
        </button>
        <button
          onClick={exportToExcel}
          className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-all"
        >
          Ekspor Excel
        </button>
      </div>

      {/* Layout: Daftar Menu Terlaris dan Pie Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Daftar Menu Terlaris */}
        <div className="overflow-x-auto">
          <ul className="space-y-2">
            {topSellers.map((item, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></div>
                <span className="font-medium flex-1 whitespace-normal">
                  {index === 0 && <span className="text-[#FF8A00]">Terlaris: </span>}
                  {item.menuName} - {item.totalSold} terjual
                </span>
              </li>
            ))}
          </ul>
        </div>
        {/* Pie Chart */}
        <div className="h-48">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={topSellers}
                dataKey="totalSold"
                nameKey="menuName"
                cx="50%"
                cy="50%"
                outerRadius={60}
                fill="#8884d8"
                labelLine={false}
                label={false}
              >
                {topSellers.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
