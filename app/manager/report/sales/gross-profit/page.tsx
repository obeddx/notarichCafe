// pages/manager/report/sales/gross-profit/page.tsx
"use client";
import { useState, useEffect, ChangeEvent } from "react";
import SalesLayout from "@/components/SalesLayout";
import { ExportButton } from "@/components/ExportButton";

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

const GrossProfit = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("daily");
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>(""); // untuk opsi custom
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = "";
      if (selectedPeriod === "custom") {
        url = `/api/gross-profit?startDate=${startDate}`;
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
        url = `/api/gross-profit?period=${periodQuery}&date=${queryDate}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Gagal mengambil data gross profit");
      }
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error(error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedPeriod, startDate, endDate]);

  const formatCurrency = (num: number | undefined) => "Rp " + (num ?? 0).toLocaleString("id-ID");

  // Dari API, summary.grossSales adalah nilai Gross Profit (yang ditampilkan sebagai Gross Sales)
  const grossSales = data?.summary?.grossSales ?? 0;
  const cogs = data?.summary?.cogs ?? 0;
  const netSales = data?.summary?.netSales ?? 0;
  const cogsPercentage = netSales > 0 ? ((cogs / netSales) * 100).toFixed(2) : "0.00";

  // Siapkan data export untuk Gross Profit
  const tableData = data ? [{
    grossSales: data.summary.grossSales,
    discounts: data.summary.discounts,
    refunds: data.summary.refunds,
    netSales: data.summary.netSales,
    cogs: data.summary.cogs,
  }] : [];
  const columns = [
    { header: "Gross Sales", key: "grossSales" },
    { header: "Discounts", key: "discounts" },
    { header: "Refunds", key: "refunds" },
    { header: "Net Sales", key: "netSales" },
    { header: "COGS", key: "cogs" },
  ];

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
         <h1 className="text-2xl font-bold">Gross Profit</h1>
         <ExportButton data={tableData} columns={columns} fileName="GrossProfit_Report" />
      </div>
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
           onClick={fetchData}
           className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded shadow"
         >
           {loading ? "Loading..." : "Cari"}
         </button>
      </div>

      {data ? (
         <div className="bg-white shadow-lg rounded-lg p-6">
            <div className="flex justify-between mb-2">
              <span>Gross Sales</span>
              <span>{formatCurrency(grossSales)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Discounts</span>
              <span>{formatCurrency(data.summary.discounts ?? 0)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Refunds</span>
              <span>{formatCurrency(data.summary.refunds ?? 0)}</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between font-bold mb-2">
              <span>Net Sales</span>
              <span>
                {formatCurrency(netSales)}{" "}
                <span className="text-green-500">(100%)</span>
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Cost of Goods Sold (COGS)</span>
              <span>
                {formatCurrency(cogs)}{" "}
                <span className="text-red-500">({cogsPercentage}%)</span>
              </span>
            </div>
         </div>
      ) : (
         <p className="text-center text-gray-600">Tidak ada data.</p>
      )}
    </div>
  );
};

export default function GrossProfitPage() {
  return (
    <SalesLayout>
      <GrossProfit />
    </SalesLayout>
  );
}
