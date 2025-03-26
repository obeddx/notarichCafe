"use client";
import { useState } from "react";
import QRCodeGenerator from "@/components/QRCodeGenerator";
import Sidebar from "@/components/sidebar";

export default function GenerateQRPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  // Fungsi untuk toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="p-4 mt-[85px]" style={{ marginLeft: isSidebarOpen ? "256px" : "80px" }}>
      <h1 className="text-3xl font-bold mb-6">Generate QR Code Meja</h1>
      <Sidebar onToggle={toggleSidebar} isOpen={isSidebarOpen} />
      <QRCodeGenerator />
    </div>
  );
}
