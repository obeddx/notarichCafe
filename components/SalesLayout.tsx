"use client";
import { ReactNode, useState } from "react";
import Sidebar from "./sidebar";
import SidebarSales from "./SidebarSales";

interface SalesLayoutProps {
  children: ReactNode;
}

const SalesLayout: React.FC<SalesLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div
      className="min-h-screen transition-all"
      style={{ marginLeft: isSidebarOpen ? "256px" : "80px" }}
    >
      {/* Global Sidebar */}
      <Sidebar onToggle={toggleSidebar} isOpen={isSidebarOpen} />
      <div className="flex">
        {/* Sidebar Sales */}
        <div className="w-64 min-h-screen">
          <SidebarSales />
        </div>
        {/* Area Konten untuk Report Sales */}
        <div className="flex-1 p-4 bg-gray-100 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SalesLayout;
