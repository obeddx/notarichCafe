"use client";
import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FaShoppingCart, FaMoneyBillWave, FaCrown } from "react-icons/fa";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

const COLORS = ["#FF8A00", "#975F2C", "#8A4210", "#92700C", "#212121"];

export default function TopSellers() {
  const [topSellers, setTopSellers] = useState<{ menuName: string; totalSold: number }[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  useEffect(() => {
    async function fetchTopSellers() {
      try {
        const res = await fetch(`/api/topSellers?period=${period}`);
        const data = await res.json();
        setTopSellers(data.topSellers);
        setTotalOrders(data.totalOrders);
        setTotalRevenue(data.totalRevenue);
      } catch (error) {
        console.error("Error fetching top sellers:", error);
      }
    }

    fetchTopSellers();
  }, [period]);

  // Fungsi untuk ekspor ke PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const title = "Laporan Top Sellers";
    const headers = [["Menu", "Total Terjual"]];

    // Format data untuk tabel PDF
    const data = topSellers.map((item) => [item.menuName, item.totalSold]);

    // Tambahkan ringkasan data
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(12);
    doc.text(`Total Pesanan: ${totalOrders}`, 14, 32);
    doc.text(`Total Pendapatan: Rp ${totalRevenue.toLocaleString()}`, 14, 42);
    doc.text(`Menu Terlaris: ${topSellers[0]?.menuName || "-"} (${topSellers[0]?.totalSold || 0} terjual)`, 14, 52);

    // Tambahkan tabel
    (doc as any).autoTable({
      head: headers,
      body: data,
      startY: 60,
      theme: "striped",
      styles: { fontSize: 12, cellPadding: 3 },
      headStyles: { fillColor: "#FF8A00" },
    });

    // Simpan file
    doc.save("laporan_top_sellers.pdf");
  };

  // Fungsi untuk ekspor ke Excel
  const exportToExcel = () => {
    // Format data untuk Excel
    const data = topSellers.map((item) => ({
      Menu: item.menuName,
      "Total Terjual": item.totalSold,
    }));

    // Tambahkan ringkasan data
    const summary = [
      { Menu: "Total Pesanan", "Total Terjual": totalOrders },
      { Menu: "Total Pendapatan", "Total Terjual": `Rp ${totalRevenue.toLocaleString()}` },
      { Menu: "Menu Terlaris", "Total Terjual": `${topSellers[0]?.menuName || "-"} (${topSellers[0]?.totalSold || 0} terjual)` },
    ];

    // Gabungkan data dan ringkasan
    const finalData = [...data, ...summary];

    // Buat worksheet dan workbook
    const worksheet = XLSX.utils.json_to_sheet(finalData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Top Sellers");

    // Simpan file
    XLSX.writeFile(workbook, "laporan_top_sellers.xlsx");
  };

  return (
    <div className="mt-8 p-6 bg-[#F8F8F8] rounded-lg shadow-lg min-h-[400px] w-full">
      <h2 className="text-2xl font-bold text-[#8A4210] mb-6">📊 Top Seller</h2>

      {/* Dropdown Pilihan Periode */}
      <div className="mb-6">
        <label htmlFor="period" className="text-[#212121] font-medium mr-2">Pilih Periode:</label>
        <select
          id="period"
          value={period}
          onChange={(e) => setPeriod(e.target.value as "daily" | "weekly" | "monthly")}
          className="p-2 bg-[#FCFFFC] text-[#212121] border border-[#8A4210] rounded-md cursor-pointer hover:bg-[#FF8A00] hover:text-white transition-all"
        >
          <option value="daily">Harian</option>
          <option value="weekly">Mingguan</option>
          <option value="monthly">Bulanan</option>
        </select>
      </div>

      {/* Tombol Ekspor */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={exportToPDF}
          className="px-4 py-2 bg-[#FF8A00] text-white rounded hover:bg-[#FF6F00] transition-all"
        >
          Ekspor ke PDF
        </button>
        <button
          onClick={exportToExcel}
          className="px-4 py-2 bg-[#4CAF50] text-white rounded hover:bg-[#45a049] transition-all"
        >
          Ekspor ke Excel
        </button>
      </div>

      {/* Ringkasan Data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Total Pesanan */}
        <div className="bg-[#FF8A00] text-[#F8F8F8] p-5 rounded-xl shadow-md flex items-center">
          <FaShoppingCart className="text-3xl mr-4" />
          <div>
            <h3 className="text-lg font-semibold">Total Pesanan</h3>
            <p className="text-2xl font-bold">{totalOrders}</p>
          </div>
        </div>

        {/* Total Pendapatan */}
        <div className="bg-[#8A4210] text-[#F8F8F8] p-5 rounded-xl shadow-md flex items-center">
          <FaMoneyBillWave className="text-3xl mr-4" />
          <div>
            <h3 className="text-lg font-semibold">Total Pendapatan</h3>
            <p className="text-2xl font-bold">Rp {totalRevenue.toLocaleString()}</p>
          </div>
        </div>

        {/* Menu Terlaris */}
        {topSellers.length > 0 && (
          <div className="bg-[#92700C] text-[#F8F8F8] p-5 rounded-xl shadow-md flex items-center min-h-[100px] w-full">
            <FaCrown className="text-3xl mr-4" />
            <div className="w-full">
              <h3 className="text-lg font-semibold">Menu Terlaris</h3>
              <p 
                className="text-xl font-bold whitespace-normal break-words w-full px-2" 
                title={topSellers[0].menuName} // Tooltip saat hover
              >
                {topSellers[0].menuName}
              </p>
              <p className="text-sm">{topSellers[0].totalSold} terjual</p>
            </div>
          </div>
        )}
      </div>

      {/* Grafik Pie Chart */}
      <div className="w-full h-[400px]">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={topSellers}
              cx="50%"
              cy="55%" // Digeser sedikit ke bawah
              labelLine={true} // Pastikan garis label tetap terlihat
              outerRadius={130} // Dikecilkan sedikit untuk memberi ruang
              fill="#8884d8"
              dataKey="totalSold"
              nameKey="menuName"
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(2)}%)`}
            >
              {topSellers.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}