"use client";
import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FaShoppingCart, FaMoneyBillWave, FaCrown } from "react-icons/fa";

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
