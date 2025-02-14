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
  ResponsiveContainer 
} from "recharts";

export default function RevenueComparisonChart() {
  const [data, setData] = useState<{ month: string; thisMonth: number; lastMonth: number }[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/revenueComparison");
        const data = await res.json();
        setData(data);
      } catch (error) {
        console.error("Error fetching revenue comparison:", error);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="mt-8 p-6 bg-[#FCFFFC] shadow-lg rounded-xl">
      <h2 className="text-2xl font-bold mb-4 text-[#212121]">
        Perbandingan Pendapatan Bulan Ini vs Bulan Lalu
      </h2>

      {/* Grafik */}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          
          {/* Label Sumbu X */}
          <XAxis 
            dataKey="month" 
            tick={{ fill: "#212121", fontSize: 12 }}
          />
          <YAxis tick={{ fill: "#212121", fontSize: 12 }} />

          {/* Tooltip dengan styling lebih smooth */}
          <Tooltip 
            contentStyle={{ backgroundColor: "#FFFAF0", borderRadius: "8px", borderColor: "#FF8A00" }} 
            formatter={(value) => [`Rp ${value.toLocaleString()}`, "Pendapatan"]}
          />

          <Legend verticalAlign="top" align="right" iconType="circle" />

          {/* Bar Chart dengan warna sesuai palette */}
          <Bar 
            dataKey="thisMonth" 
            fill="#FF8A00" 
            name="Bulan Ini" 
            radius={[8, 8, 0, 0]} 
          />
          <Bar 
            dataKey="lastMonth" 
            fill="#6A0572" 
            name="Bulan Lalu" 
            radius={[8, 8, 0, 0]} 
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
