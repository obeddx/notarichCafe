// pages/manager/report/sales/summary/page.tsx
"use client";
import { useState, useEffect, ChangeEvent } from "react";
import SalesLayout from "@/components/SalesLayout";
import { ExportButton } from "@/components/ExportButton"; // Import komponen ExportButton

// Helper: menghitung tanggal sebelumnya sesuai periode
const getPreviousDate = (dateStr: string, period: string): string => {
  const date = new Date(dateStr);
  switch (period) {
    case "daily":
      date.setDate(date.getDate() - 1);
      break;
    case "weekly":
      date.setDate(date.getDate() - 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() - 1);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() - 1);
      break;
    default:
      break;
  }
  return date.toISOString().split("T")[0];
};

const SalesSummary = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("daily");
  const [startDate, setStartDate] = useState<string>(() =>
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(""); // hanya untuk opsi custom
  const [salesSummary, setSalesSummary] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      let url = "";
      if (selectedPeriod === "custom") {
        url = `/api/sales-summary?startDate=${startDate}`;
        if (endDate) {
          url += `&endDate=${endDate}`;
        }
      } else {
        let periodQuery = selectedPeriod;
        let queryDate = startDate;
        if (selectedPeriod.endsWith("-prev")) {
          const basePeriod = selectedPeriod.split("-")[0];
          queryDate = getPreviousDate(startDate, basePeriod);
          periodQuery = basePeriod;
        }
        url = `/api/sales-summary?period=${periodQuery}&date=${queryDate}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Gagal mengambil data sales summary");
      }
      const data = await res.json();
      setSalesSummary(data);
    } catch (error) {
      console.error(error);
      setSalesSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [selectedPeriod, startDate, endDate]);

  const formatCurrency = (num: number) =>
    "Rp " + num.toLocaleString("id-ID");

  // Data untuk ekspor
  const exportData = salesSummary
    ? [
        {
          grossSales: salesSummary.grossSales,
          discounts: salesSummary.discounts,
          refunds: salesSummary.refunds,
          netSales: salesSummary.netSales,
          gratuity: salesSummary.gratuity,
          rounding: salesSummary.rounding,
          totalCompleted: salesSummary.totalCompleted,
        },
      ]
    : [];

  // Kolom untuk ekspor
  const exportColumns = [
    { header: "Gross Sales", key: "grossSales" },
    { header: "Discounts", key: "discounts" },
    { header: "Refunds", key: "refunds" },
    { header: "Net Sales", key: "netSales" },
    { header: "Gratuity", key: "gratuity" },
    { header: "Rounding", key: "rounding" },
    { header: "Total Completed", key: "totalCompleted" },
  ];

  return (
    <div className="w-full">
      {/* Bagian Header dengan judul dan tombol Export */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Sales Summary</h1>
        {/* Tombol Export */}
        <ExportButton
          data={exportData}
          columns={exportColumns}
          fileName={`sales-summary-${selectedPeriod}-${startDate}`}
        />
      </div>

      {/* Konten utama */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <div>
          <label htmlFor="period" className="mr-2 text-[#212121] font-medium">
            Pilih Periode:
          </label>
          <select
            id="period"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="p-2 border rounded bg-[#FFFAF0] text-[#212121] shadow-sm"
          >
            <option value="daily">Hari Ini</option>
            <option value="daily-prev">Hari Sebelumnya</option>
            <option value="weekly">Minggu Ini</option>
            <option value="weekly-prev">Minggu Lalu</option>
            <option value="monthly">Bulan Ini</option>
            <option value="monthly-prev">Bulan Lalu</option>
            <option value="yearly">Tahun Ini</option>
            <option value="yearly-prev">Tahun Lalu</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div className="flex gap-2 items-center">
          <label htmlFor="startDate" className="text-[#212121] font-medium">
            Tanggal:
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setStartDate(e.target.value)
            }
            className="p-2 border rounded bg-[#FFFAF0] text-[#212121] shadow-sm"
          />
        </div>
        {selectedPeriod === "custom" && (
          <div className="flex gap-2 items-center">
            <label htmlFor="endDate" className="text-[#212121] font-medium">
              Sampai:
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setEndDate(e.target.value)
              }
              className="p-2 border rounded bg-[#FFFAF0] text-[#212121] shadow-sm"
            />
          </div>
        )}
        <button
          onClick={fetchSummary}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded shadow"
        >
          {loading ? "Loading..." : "Cari"}
        </button>
      </div>
      {salesSummary ? (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="flex justify-between mb-2">
            <span>Gross Sales</span>
            <span>{formatCurrency(salesSummary.grossSales)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Discounts</span>
            <span>{formatCurrency(salesSummary.discounts)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Refunds</span>
            <span>{formatCurrency(salesSummary.refunds)}</span>
          </div>
          <hr className="my-2" />
          <div className="flex justify-between font-bold mb-2">
            <span>Net Sales</span>
            <span>{formatCurrency(salesSummary.netSales)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Gratuity</span>
            <span>{formatCurrency(salesSummary.gratuity)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Rounding</span>
            <span>{formatCurrency(salesSummary.rounding)}</span>
          </div>
          <hr className="my-2" />
          <div className="flex justify-between font-bold">
            <span>Total Completed</span>
            <span>{formatCurrency(salesSummary.totalCompleted)}</span>
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-600">Tidak ada data.</p>
      )}
    </div>
  );
};

export default function SalesSummaryPage() {
  return (
    <SalesLayout>
      <SalesSummary />
    </SalesLayout>
  );
}