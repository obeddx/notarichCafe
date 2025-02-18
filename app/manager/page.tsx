"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import SalesChart from "@/components/SalesChart";
import TopSellers from "@/components/TopSellers";
import RevenueByCategoryChart from "@/components/RevenueByCategoryChart";
import RevenueComparisonChart from "@/components/RevenueComparisonChart";
import GrossMarginChart from "@/components/GrossMarginChart";

interface StatCardProps {
  title: string;
  value: string | number;
  percentage: string;
  icon: string;
  color: string;
}

export default function Stats() {
  const [orderCount, setOrderCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true); // State untuk sidebar

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/completeOrderStats");
        const data = await res.json();
        setOrderCount(data.orderCount);
        setTotalRevenue(data.totalRevenue);
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-[#FFFAF0] to-[#FCFFFC]">
      {/* Sidebar */}
      <Sidebar onToggle={setSidebarOpen} isOpen={sidebarOpen} /> {/* Teruskan state ke Sidebar */}

      {/* Konten utama yang otomatis menyesuaikan */}
      <div className={`flex-1 p-6 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        <h1 className="text-4xl font-bold text-[#212121] mb-6">Dashboard Manager</h1>

        {/* Statistik Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Pesanan"
            value={orderCount.toLocaleString()}
            percentage="+21%"
            icon="🛒"
            color="text-green-500"
          />
          <StatCard
            title="Total Pendapatan"
            value={`Rp ${totalRevenue.toLocaleString()}`}
            percentage="+21%"
            icon="💰"
            color="text-yellow-500"
          />
          <StatCard
            title="Total Pengguna"
            value="1.2K"
            percentage="Baru bulan ini"
            icon="👥"
            color="text-blue-500"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <SalesChart />
          <RevenueComparisonChart />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <TopSellers />
          <RevenueByCategoryChart />
        </div>
        
        <div>
          <GrossMarginChart />
        </div>
      </div>
    </div>
  );
}

const StatCard: React.FC<StatCardProps> = ({ title, value, percentage, icon, color }) => {
  return (
    <div className="p-6 bg-white shadow-md rounded-xl flex items-center gap-4 transition-transform hover:scale-105">
      <div className={`text-4xl ${color}`}>{icon}</div>
      <div>
        <div className="text-lg font-semibold text-[#212121]">{title}</div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-gray-500">{percentage}</div>
      </div>
    </div>
  );
};