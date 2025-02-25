// File: components/SalesChart.tsx
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

interface SalesData {
  date: string;
  total: number;
}

interface SalesDetailSummary {
  totalSales: number;
  totalOrders: number;
}

interface SalesDetailItem {
  orderId: number;
  createdAt: string;
  total: number;
  items: {
    menuName: string;
    quantity: number;
    price: number;
  }[];
}

export default function SalesChart() {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const totalRevenue = Array.isArray(salesData)
    ? salesData.reduce((sum, item) => sum + item.total, 0)
    : 0;

  const [selectedDetail, setSelectedDetail] = useState<{
    date: string;
    summary: SalesDetailSummary;
    orders: SalesDetailItem[];
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    async function fetchSalesData() {
      try {
        let url = `/api/salesData?period=${period}`;
        if (startDate && endDate) {
          url += `&start=${startDate}&end=${endDate}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        setSalesData(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching sales data:", error);
      }
    }
    fetchSalesData();
  }, [period, startDate, endDate]);

  const formatDate = (dateString: string) => {
    if (period === "daily") {
      const date = new Date(dateString);
      return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
    } else if (period === "weekly") {
      const weekNumber = dateString.split("-W")[1];
      return `Minggu ke-${weekNumber}`;
    } else if (period === "monthly") {
      const [year, month] = dateString.split("-");
      const date = new Date(Number(year), Number(month) - 1, 1);
      return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    } else if (period === "yearly") {
      return dateString;
    }
    return dateString;
  };

  const handleBarClick = async (data: any) => {
    const clickedDate = data.date;
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/salesDetail?date=${clickedDate}&period=${period}`);
      const detailData = await res.json();
      setSelectedDetail({
        date: clickedDate,
        summary: detailData.summary,
        orders: detailData.orders,
      });
    } catch (error) {
      console.error("Error fetching sales detail:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const title = "Laporan Penjualan";
    const headers = [["Tanggal", "Total Pendapatan (Rp)"]];
    const tableData = salesData.map((item) => [
      formatDate(item.date),
      item.total.toLocaleString(),
    ]);
    tableData.push(["Total", totalRevenue.toLocaleString()]);
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    (doc as any).autoTable({
      head: headers,
      body: tableData,
      startY: 30,
      theme: "striped",
      styles: { fontSize: 12, cellPadding: 3 },
      headStyles: { fillColor: "#FF8A00" },
    });
    doc.save("laporan_penjualan.pdf");
  };

  const exportToExcel = () => {
    const dataForExcel = salesData.map((item) => ({
      Tanggal: formatDate(item.date),
      "Total Pendapatan (Rp)": item.total,
    }));
    dataForExcel.push({
      Tanggal: "Total",
      "Total Pendapatan (Rp)": totalRevenue,
    });
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Penjualan");
    XLSX.writeFile(workbook, "laporan_penjualan.xlsx");
  };

  return (
    <div className="mt-8 p-6 bg-[#FCFFFC] shadow-lg rounded-xl">
      <h2 className="text-2xl font-bold mb-4 text-[#212121]">Grafik Penjualan</h2>

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
          className="px-4 py-2 bg-[#FF8A00] text-white rounded hover:bg-[#FF6F00] transition-all"
        >
          Ekspor ke PDF
        </button>
        <button
          onClick={exportToExcel}
          className="px-4 py-2 bg-[#4CAF50] text-white rounded hover:bg-[#45a049] transition-all"
        >
          Ekspor ke Excel
        </button>
      </div>

      <div className="mb-6">
        <p className="text-lg font-semibold text-[#212121]">
          Total Pendapatan:{" "}
          <span className="text-[#FF8A00]">Rp {totalRevenue.toLocaleString()}</span>
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={salesData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: "#212121", fontSize: 12 }}
          />
          <YAxis tick={{ fill: "#212121", fontSize: 12 }} />
          <Tooltip
            contentStyle={{ backgroundColor: "#FFFAF0", borderRadius: "8px", borderColor: "#FF8A00" }}
            labelFormatter={(value) => `Tanggal: ${formatDate(value)}`}
            formatter={(value) => [`Rp ${value.toLocaleString()}`, "Total Pendapatan"]}
          />
          <Legend verticalAlign="top" align="right" iconType="circle" />
          <Bar
            dataKey="total"
            fill="#FF8A00"
            radius={[8, 8, 0, 0]}
            onClick={(barData) => handleBarClick(barData.payload)}
          />
        </BarChart>
      </ResponsiveContainer>

      {selectedDetail && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg w-2/3 max-h-screen overflow-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">
                Detail Penjualan Tanggal: {formatDate(selectedDetail.date)}
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
              <>
                <div className="mb-4 p-4 bg-gray-100 rounded">
                  <p>
                    <strong>Total Sales:</strong> Rp{" "}
                    {selectedDetail.summary.totalSales?.toLocaleString() || 0}
                  </p>
                  <p>
                    <strong>Total Orders:</strong>{" "}
                    {selectedDetail.summary.totalOrders || 0}
                  </p>
                </div>
                <h3 className="text-lg font-semibold mb-2">Detail Order</h3>
                {selectedDetail.orders?.length > 0 ? (
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        <th className="border px-2 py-1">Order ID</th>
                        <th className="border px-2 py-1">Tanggal</th>
                        <th className="border px-2 py-1">Total</th>
                        <th className="border px-2 py-1">Items</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDetail.orders.map((order, idx) => (
                        <tr key={idx}>
                          <td className="border px-2 py-1">{order.orderId}</td>
                          <td className="border px-2 py-1">
                            {new Date(order.createdAt).toLocaleString()}
                          </td>
                          <td className="border px-2 py-1">
                            Rp {order.total.toLocaleString()}
                          </td>
                          <td className="border px-2 py-1">
                            {order.items.map((item, i) => (
                              <div key={i}>
                                {item.menuName} x{item.quantity} (Rp{" "}
                                {item.price.toLocaleString()})
                              </div>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>Tidak ada detail order untuk tanggal ini.</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}