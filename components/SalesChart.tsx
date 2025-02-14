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

export default function SalesChart() {
  const [salesData, setSalesData] = useState<{ date: string; total: number }[]>([]);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  // State untuk custom range
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    async function fetchSalesData() {
      try {
        let url = `/api/salesData?period=${period}`;

        // Tambahkan query params jika pengguna memilih custom range
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

  // Fungsi untuk memformat tanggal agar lebih mudah dibaca
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (period === "daily") {
      return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
    } else if (period === "weekly") {
      const weekNumber = dateString.split("-W")[1]; // Ambil nomor minggu dari string
      return `Minggu ke-${weekNumber}`;
    } else {
      return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    }
  };

  return (
    <div className="mt-8 p-6 bg-[#FCFFFC] shadow-lg rounded-xl">
      <h2 className="text-2xl font-bold mb-4 text-[#212121]">Grafik Penjualan</h2>

      {/* Dropdown untuk memilih periode */}
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

        {/* Input tanggal untuk custom range */}
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

      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={salesData}
          margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          
          {/* Memformat label pada X-Axis */}
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
