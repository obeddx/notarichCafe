// pages/manager/report/sales/transaction/SalesTransactionChart.tsx
"use client";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

export default function SalesTransactionChart() {
  const [salesData, setSalesData] = useState<
    { date: string; salesPerTransaction: number }[]
  >([]);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedDetail, setSelectedDetail] = useState<{
    date: string;
    summary: {
      netSales: number;
      transactionCount: number;
      salesPerTransaction: number;
    };
    details: {
      menuName: string;
      sellingPrice: number;
      quantity: number;
      totalSales: number;
    }[];
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    async function fetchSalesData() {
      try {
        let url = `/api/salesPerTransactionData?period=${period}`;
        if (startDate && endDate) {
          url += `&start=${startDate}&end=${endDate}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        setSalesData(data);
      } catch (error) {
        console.error("Error fetching sales data:", error);
      }
    }
    fetchSalesData();
  }, [period, startDate, endDate]);

  const formatDate = (dateString: string): string => {
    if (period === "daily") {
      const date = new Date(dateString);
      return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
    } else if (period === "weekly") {
      const weekNumber = dateString.split("-W")[1];
      return `Minggu ke-${weekNumber}`;
    } else if (period === "monthly") {
      const [year, month] = dateString.split("-");
      const date = new Date(Number(year), Number(month) - 1);
      return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    } else if (period === "yearly") {
      return dateString;
    }
    return "";
  };

  const handleBarClick = async (data: any) => {
    const clickedDate = data.date;
    setLoadingDetail(true);
    try {
      const detailUrl = `/api/salesTransactionDetail?date=${clickedDate}&period=${period}`;
      const res = await fetch(detailUrl);
      const detailData = await res.json();
      setSelectedDetail({
        date: clickedDate,
        summary: detailData.summary,
        details: detailData.details,
      });
    } catch (error) {
      console.error("Error fetching sales detail:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const title = "Laporan Sales per Transaction";
    const headers = [["Tanggal", "Sales per Transaction"]];
    const data = salesData.map((item) => [
      formatDate(item.date),
      item.salesPerTransaction.toFixed(2),
    ]);

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    (doc as any).autoTable({
      head: headers,
      body: data,
      startY: 30,
      theme: "striped",
      styles: { fontSize: 12, cellPadding: 3 },
      headStyles: { fillColor: "#4CAF50" },
    });
    doc.save("laporan_sales_per_transaction.pdf");
  };

  const exportToExcel = () => {
    const data = salesData.map((item) => ({
      Tanggal: formatDate(item.date),
      "Sales per Transaction": item.salesPerTransaction.toFixed(2),
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Sales per Transaction");
    XLSX.writeFile(workbook, "laporan_sales_per_transaction.xlsx");
  };

  return (
    <div className="mt-8 p-6 bg-[#FCFFFC] shadow-lg rounded-xl">
      <h2 className="text-2xl font-bold mb-4 text-[#212121]">
        Grafik Sales per Transaction
      </h2>

      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label htmlFor="period" className="mr-2 text-[#212121] font-medium">
            Pilih Periode:
          </label>
          <select
            id="period"
            value={period}
            onChange={(e) =>
              setPeriod(e.target.value as "daily" | "weekly" | "monthly" | "yearly")
            }
            className="p-2 border rounded bg-[#FFFAF0] text-[#212121] shadow-sm"
          >
            <option value="daily">Harian</option>
            <option value="weekly">Mingguan</option>
            <option value="monthly">Bulanan</option>
            <option value="yearly">Tahunan</option>
          </select>
        </div>

        <div className="flex gap-2 items-center">
          <label className="text-[#212121] font-medium">Dari:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-2 border rounded bg-[#FFFAF0] text-[#212121] shadow-sm"
          />
        </div>

        <div className="flex gap-2 items-center">
          <label className="text-[#212121] font-medium">Sampai:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-2 border rounded bg-[#FFFAF0] text-[#212121] shadow-sm"
          />
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={exportToPDF}
          className="px-4 py-2 bg-[#FF8A00] text-white rounded hover:bg-[#45a049] transition-all"
        >
          Ekspor ke PDF
        </button>
        <button
          onClick={exportToExcel}
          className="px-4 py-2 bg-[#4CAF50] text-white rounded hover:bg-[#1e88e5] transition-all"
        >
          Ekspor ke Excel
        </button>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={salesData}
          margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: "#212121", fontSize: 12 }}
          />
          <YAxis tick={{ fill: "#212121", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFAF0",
              borderRadius: "8px",
              borderColor: "#4CAF50",
            }}
            labelFormatter={(value) => `Tanggal: ${formatDate(value)}`}
            formatter={(value) => {
              if (typeof value === "number") {
                return [`${value.toFixed(2)}`, "Sales per Transaction"];
              }
              return [value, "Sales per Transaction"];
            }}
          />
          <Legend verticalAlign="top" align="right" iconType="circle" />
          <Bar
            dataKey="salesPerTransaction"
            fill="#4CAF50"
            radius={[8, 8, 0, 0]}
            onClick={(data) => handleBarClick(data.payload)}
          />
        </BarChart>
      </ResponsiveContainer>

      {selectedDetail && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg w-2/3 max-h-screen overflow-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">
                Detail Sales per Transaction{" "}
                <span className="text-sm text-gray-500">
                  (Tanggal {formatDate(selectedDetail.date)})
                </span>
              </h2>
              <button
                onClick={() => setSelectedDetail(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            {loadingDetail ? (
              <p>Loading...</p>
            ) : (
              <div className="mt-4">
                <div className="mb-4 p-4 bg-gray-100 rounded">
                  <p>
                    <strong>Net Sales:</strong> Rp{" "}
                    {Number(selectedDetail.summary.netSales).toLocaleString()}
                  </p>
                  <p>
                    <strong>Jumlah Transaksi:</strong>{" "}
                    {selectedDetail.summary.transactionCount}
                  </p>
                  <p>
                    <strong>Sales per Transaction:</strong>{" "}
                    {selectedDetail.summary.salesPerTransaction.toFixed(2)}
                  </p>
                </div>
                <h3 className="text-lg font-semibold mb-2">Detail Menu</h3>
                {selectedDetail.details.length > 0 ? (
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        <th className="border px-2 py-1">Menu</th>
                        <th className="border px-2 py-1">Harga Jual</th>
                        <th className="border px-2 py-1">Jumlah Terjual</th>
                        <th className="border px-2 py-1">Total Sales</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDetail.details.map((item, index) => (
                        <tr key={index}>
                          <td className="border px-2 py-1">{item.menuName}</td>
                          <td className="border px-2 py-1">
                            Rp {Number(item.sellingPrice).toLocaleString()}
                          </td>
                          <td className="border px-2 py-1">{item.quantity}</td>
                          <td className="border px-2 py-1">
                            Rp {Number(item.totalSales).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>Tidak ada detail menu untuk tanggal ini.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}