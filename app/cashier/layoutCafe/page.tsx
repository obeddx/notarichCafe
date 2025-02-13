"use client";

import { useState } from "react";
import SidebarCashier from "@/components/sidebarCashier";

const Bookinge = () => {
  const [selectedFloor, setSelectedFloor] = useState(1); // Default Lantai 1

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 fixed h-full">
        <SidebarCashier />
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 p-8">
        <div className="w-full sm:px-6 lg:px-28">
          <h2 className="text-3xl font-semibold mb-8 text-black">Pilih Meja Anda</h2>
          
          {/* Floor Selection */}
          <form className="mb-8">
            <label className="px-4">
              <input
                type="radio"
                name="floor"
                value="1"
                checked={selectedFloor === 1}
                onChange={() => setSelectedFloor(1)}
                className="checked:bg-[#FF8A00]"
              />{" "}
              Lantai 1
            </label>
            <label className="px-4">
              <input
                type="radio"
                name="floor"
                value="2"
                checked={selectedFloor === 2}
                onChange={() => setSelectedFloor(2)}
                className="checked:bg-[#FF8A00]"
              />{" "}
              Lantai 2
            </label>
          </form>

          {/* Content Section */}
          <div className="bg-[#F7F5F2] p-6 rounded-lg shadow-lg w-full">
            <p>Denah meja akan ditampilkan di sini...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Bookinge;
