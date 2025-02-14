"use client";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

export default function SalesChart() {
  const [salesData, setSalesData] = useState<{ date: string; total: number }[]>([]);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Hitung total pendapatan dari salesData
  const totalRevenue = salesData.reduce((sum, item) => sum + item.total, 0);

  useEffect(() => {
    async function fetchSalesData() {
      try {
        let url = `/api/salesData?period=${period}`;
        if (startDate && endDate) {
          url += `&start=${startDate}&end=${endDate}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        setSalesData(data);
      } catch (error) {
        console.error("Error fetching sales data:", error);
      }
    }

    fetchSalesData();
  }, [period, startDate, endDate]);

  // Fungsi untuk memformat tanggal
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (period === "daily") {
      return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
    } else if (period === "weekly") {
      const weekNumber = dateString.split("-W")[1];
      return `Minggu ke-${weekNumber}`;
    } else {
      return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    }
  };

  // Fungsi untuk ekspor ke PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const title = "Laporan Penjualan";
    const headers = [["Tanggal", "Total Pendapatan (Rp)"]];

    // Format data untuk tabel PDF
    const data = salesData.map((item) => [
      formatDate(item.date),
      item.total.toLocaleString(),
    ]);

    // Tambahkan baris total pendapatan
    data.push(["Total", totalRevenue.toLocaleString()]);

    // Tambahkan judul
    doc.setFontSize(18);
    doc.text(title, 14, 22);

    // Tambahkan tabel
    (doc as any).autoTable({
      head: headers,
      body: data,
      startY: 30,
      theme: "striped",
      styles: { fontSize: 12, cellPadding: 3 },
      headStyles: { fillColor: "#FF8A00" },
    });

    // Simpan file
    doc.save("laporan_penjualan.pdf");
  };

  // Fungsi untuk ekspor ke Excel
  const exportToExcel = () => {
    // Format data untuk Excel
    const data = salesData.map((item) => ({
      Tanggal: formatDate(item.date),
      "Total Pendapatan (Rp)": item.total,
    }));

    // Tambahkan baris total pendapatan
    data.push({
      Tanggal: "Total",
      "Total Pendapatan (Rp)": totalRevenue,
    });

    // Buat worksheet dan workbook
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Penjualan");

    // Simpan file
    XLSX.writeFile(workbook, "laporan_penjualan.xlsx");
  };

  return (
    <div className="mt-8 p-6 bg-[#FCFFFC] shadow-lg rounded-xl">
      <h2 className="text-2xl font-bold mb-4 text-[#212121]">Grafik Penjualan</h2>

      {/* Dropdown dan input tanggal */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label htmlFor="period" className="mr-2 text-[#212121] font-medium">Pilih Periode:</label>
          <select
            id="period"
            value={period}
            onChange={(e) => setPeriod(e.target.value as "daily" | "weekly" | "monthly")}
            className="p-2 border rounded bg-[#FFFAF0] text-[#212121] shadow-sm"
          >
            <option value="daily">Harian</option>
            <option value="weekly">Mingguan</option>
            <option value="monthly">Bulanan</option>
          </select>
        </div>

        <div className="flex gap-2 items-center">
          <label className="text-[#212121] font-medium">Dari:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-2 border rounded bg-[#FFFAF0] text-[#212121] shadow-sm"
          />
        </div>

        <div className="flex gap-2 items-center">
          <label className="text-[#212121] font-medium">Sampai:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-2 border rounded bg-[#FFFAF0] text-[#212121] shadow-sm"
          />
        </div>
      </div>

      {/* Tombol ekspor */}
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

      {/* Total Pendapatan */}
      <div className="mb-6">
        <p className="text-lg font-semibold text-[#212121]">
          Total Pendapatan:{" "}
          <span className="text-[#FF8A00]">Rp {totalRevenue.toLocaleString()}</span>
        </p>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={salesData}
          margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: "#212121", fontSize: 12 }}
          />
          <YAxis tick={{ fill: "#212121", fontSize: 12 }} />
          <Tooltip
            contentStyle={{ backgroundColor: "#FFFAF0", borderRadius: "8px", borderColor: "#FF8A00" }}
            labelFormatter={(value) => `Tanggal: ${formatDate(value)}`}
            formatter={(value) => [`Rp ${value.toLocaleString()}`, "Total Pendapatan"]}
          />
          <Legend verticalAlign="top" align="right" iconType="circle" />
          <Bar dataKey="total" fill="#FF8A00" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}