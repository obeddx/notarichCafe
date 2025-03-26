"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import SalesChart from "@/components/SalesChart";
import GrossMarginChart from "@/components/GrossMarginChart";
import SalesTransactionChart from "@/components/SalesTransactionChart";
import StatsCards from "@/components/StatsCards";
import MinimumStock from "@/components/MinimumStock";
import PaymentMethodPieChart from "@/components/PaymentMethodPieChart";
import TopSellers from "@/components/TopSellers";
import RevenueByCategoryChart from "@/components/RevenueByCategoryChart";
import EditIngredientModal from "@/components/modalEditDashboard";

export default function Stats() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Tampilkan modal saat pertama kali load
  useEffect(() => {
    setIsModalOpen(true);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#FFFAF0]">
      {/* Sidebar */}
      <Sidebar onToggle={setSidebarOpen} isOpen={sidebarOpen} />

      {/* Konten Utama */}
      <div className={`flex-1 p-4 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        <h1 className="text-3xl md:text-4xl font-bold text-[#212121] mb-4">Dashboard Manager</h1>

        {/* Baris Pertama: Stat Cards */}
        <StatsCards />

        {/* Baris Kedua: 3 Kolom */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <TopSellers />
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <MinimumStock />
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <PaymentMethodPieChart />
          </div>
        </div>

        {/* Baris Ketiga: Chart Lainnya */}
        <div className="mt-6 space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <SalesChart />
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <GrossMarginChart />
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <SalesTransactionChart />
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <RevenueByCategoryChart />
          </div>
        </div>
      </div>

      {/* Modal Edit Ingredient */}
      <EditIngredientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
