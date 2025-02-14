"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";

export default function Stats() {
  const [orderCount, setOrderCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

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
    // Container flex yang mengambil tinggi layar penuh,
    // mengarahkan isi ke kanan dan memusatkan secara vertikal
    <div className="p-4 mt-[85px] ml-0 sm:ml-64">
        <h1 className="text-3xl font-bold mb-4">Dashboard Admin</h1>
        <Sidebar />
      <div className="stats shadow-lg p-6 rounded-xl bg-gradient-to-r from-blue-50 to-white">
        <div className="stat transition-transform hover:scale-105">
          <div className="stat-figure text-primary animate-bounce">
            {/* Ikon Pesanan (Cart) */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="inline-block h-8 w-8 stroke-current"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 3h2l3.6 7.59a1 1 0 00.95.41h7.45a1 1 0 01.92 1.38l-3.7 9.3a1 1 0 01-.92.62H8a1 1 0 01-1-1V4a1 1 0 011-1z"
              />
            </svg>
          </div>
          <div className="stat-title font-bold">Total Pesanan</div>
          <div className="stat-value text-success">
            {orderCount.toLocaleString()}
          </div>
          <div className="stat-desc">21% lebih banyak dari bulan lalu</div>
        </div>

        <div className="stat transition-transform hover:scale-105">
          <div className="stat-figure text-secondary animate-bounce">
            {/* Ikon Dollar */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="inline-block h-8 w-8 stroke-current"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 1.5v21"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <path
                d="M16 6H8a4 4 0 000 8h8a4 4 0 010 8H8"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </div>
          <div className="stat-title font-bold">Total Pendapatan</div>
          <div className="stat-value text-warning">
            {totalRevenue.toLocaleString()}
          </div>
          <div className="stat-desc">21% lebih banyak dari bulan lalu</div>
        </div>

        <div className="stat transition-transform hover:scale-105">
          <div className="stat-figure text-accent animate-pulse">
            {/* Ikon Pengguna */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="inline-block h-8 w-8 stroke-current"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 20h5v-2a4 4 0 00-5-3.8M9 20H4v-2a4 4 0 015-3.8m4-1a4 4 0 110-8 4 4 0 010 8z"
              />
            </svg>
          </div>
          <div className="stat-title font-bold">Total Pengguna</div>
          <div className="stat-value text-info">1.2K</div>
          <div className="stat-desc">Baru bulan ini</div>
        </div>
      </div>
    </div>
  );
}
