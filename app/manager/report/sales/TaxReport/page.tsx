// pages/manager/report/sales/tax-report/TaxReport.tsx
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

const TaxReport = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("daily");
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>("");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = "";
      if (selectedPeriod === "custom") {
        url = `/api/tax-report?startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
      } else {
        let periodQuery = selectedPeriod;
        let queryDate = startDate;
        if (selectedPeriod.endsWith("-prev")) {
          const basePeriod = selectedPeriod.split("-")[0];
          queryDate = getPreviousDate(startDate, basePeriod);
          periodQuery = basePeriod;
        }
        url = `/api/tax-report?period=${periodQuery}&date=${queryDate}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Gagal mengambil data tax report");
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error(error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedPeriod, startDate, endDate]);

  const formatCurrency = (num: number) => "Rp " + num.toLocaleString("id-ID");

  // Hitung total
  const totalTaxableAmount = data.reduce((acc, item) => acc + item.taxableAmount, 0);
  const totalTaxCollected = data.reduce((acc, item) => acc + item.taxCollected, 0);

  // Data untuk ekspor
  const exportData = data.map(item => ({
    "Name": item.name,
    "Tax Rate": item.taxRate,
    "Taxable Amount": item.taxableAmount,
    "Tax Collected": item.taxCollected,
  }));

  exportData.push({
    "Name": "Total",
    "Tax Rate": "",
    "Taxable Amount": totalTaxableAmount,
    "Tax Collected": totalTaxCollected,
  });

  const exportColumns = [
    { header: "Name", key: "Name" },
    { header: "Tax Rate", key: "Tax Rate" },
    { header: "Taxable Amount", key: "Taxable Amount" },
    { header: "Tax Collected", key: "Tax Collected" },
  ];

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Tax Report</h1>
        <ExportButton
          data={exportData}
          columns={exportColumns}
          fileName={`Tax-report-${selectedPeriod}-${startDate}`}
        />
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
            onChange={(e: ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
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
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
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

      {data.length > 0 ? (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Tax Rate</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Taxable Amount</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Tax Collected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.taxRate}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(item.taxableAmount)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(item.taxCollected)}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-6 py-4 text-sm text-gray-900">Total</td>
                <td className="px-6 py-4 text-sm text-gray-900"></td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(totalTaxableAmount)}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(totalTaxCollected)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-gray-600">Tidak ada data.</p>
      )}
    </div>
  );
};

export default function TaxReportPage() {
  return (
    <SalesLayout>
      <TaxReport />
    </SalesLayout>
  );
}