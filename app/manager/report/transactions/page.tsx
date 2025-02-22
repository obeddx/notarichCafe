// pages/manager/report/transactions/page.tsx
"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";

const TransactionsPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Data dan logika untuk transaksi bisa dikembangkan di sini

  return (
    <div
      className="min-h-screen transition-all"
      style={{ marginLeft: isSidebarOpen ? "256px" : "80px" }}
    >
      <Sidebar onToggle={toggleSidebar} isOpen={isSidebarOpen} />
      <div className="p-4 mt-[85px] bg-gray-100">
        <h1 className="text-2xl font-bold mb-4">Transactions Report</h1>
        <p>Data transaksi akan tampil di sini.</p>
      </div>
    </div>
  );
};

export default TransactionsPage;
