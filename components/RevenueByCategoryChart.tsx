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
  Cell,
} from "recharts";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

// Warna kategori
const COLORS = ["#FF8A00", "#8A4210", "#975F2C", "#92700C", "#212121"];

// Fungsi format angka ke Rupiah
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(value);
};

interface CategoryData {
  category: string;
  total: number;
}

interface RevenueDetail {
  category: string;
  summary: {
    totalRevenue: number;
    totalOrders: number;
  };
  details: {
    orderId: number;
    orderDate: Date;
    menuName: string;
    quantity: number;
    revenue: number;
  }[];
}

export default function RevenueByCategoryChart() {
  const [data, setData] = useState<CategoryData[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<RevenueDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/revenueByCategory");
        const jsonData = await res.json();
        // Data yang diterima sudah dikelompokkan berdasarkan kategori
        setData(jsonData);
      } catch (error) {
        console.error("Error fetching revenue by category:", error);
      }
    }
    fetchData();
  }, []);

  // Fungsi untuk ekspor ke PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const title = "Laporan Pendapatan per Kategori";
    const headers = [["Kategori", "Total Pendapatan"]];
    const tableData = data.map((item) => [item.category, formatCurrency(item.total)]);

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
    doc.save("laporan_pendapatan_kategori.pdf");
  };

  // Fungsi untuk ekspor ke Excel
  const exportToExcel = () => {
    const excelData = data.map((item) => ({
      Kategori: item.category,
      "Total Pendapatan": item.total,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Pendapatan");
    XLSX.writeFile(workbook, "laporan_pendapatan_kategori.xlsx");
  };

  // Handler saat pengguna mengklik batang grafik
  const handleBarClick = async (payload: any) => {
    const clickedCategory = payload.category;
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/revenueByCategoryDetail?category=${encodeURIComponent(clickedCategory)}`);
      const detailData = await res.json();
      setSelectedDetail({
        category: clickedCategory,
        summary: detailData.summary,
        details: detailData.details,
      });
    } catch (error) {
      console.error("Error fetching revenue by category detail:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="mt-8 p-6 bg-[#F8F8F8] rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-[#8A4210] mb-6">💰 Pendapatan per Kategori Menu</h2>

      {/* Tombol Ekspor */}
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

      {/* Ringkasan Pendapatan per Kategori */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {data.map((item, index) => (
          <div key={`${item.category}-${index}`} className="p-4 bg-[#FCFFFC] shadow-md rounded-lg">
            <h3 className="text-lg font-semibold text-[#212121]">{item.category}</h3>
            <p className="text-[#FF8A00] font-bold">{formatCurrency(item.total)}</p>
          </div>
        ))}
      </div>

      {/* Grafik Pendapatan */}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis dataKey="category" tick={{ fill: "#212121", fontSize: 14 }} />
          <YAxis tick={{ fill: "#212121", fontSize: 14 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FF8A00",
              color: "#FCFFFC",
              borderRadius: 8,
              border: "none",
            }}
            cursor={{ fill: "rgba(255, 138, 0, 0.2)" }}
            formatter={(value) => formatCurrency(Number(value))}
          />
          <Legend wrapperStyle={{ color: "#212121" }} />
          <Bar
            dataKey="total"
            fill="#FF8A00"
            radius={[10, 10, 0, 0]}
            onClick={(data) => handleBarClick(data.payload)}
          >
            {data.map((item, index) => (
              <Cell key={`${item.category}-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Modal Detail */}
      {selectedDetail && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg w-11/12 max-h-screen overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Detail Pendapatan untuk kategori: {selectedDetail.category}
              </h2>
              <button
                onClick={() => setSelectedDetail(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                &times;
              </button>
            </div>
            {loadingDetail ? (
              <p>Loading...</p>
            ) : (
              <>
                <div className="mb-4 p-4 bg-gray-100 rounded">
                  <p>
                    <strong>Total Pendapatan:</strong> {formatCurrency(selectedDetail.summary.totalRevenue)}
                  </p>
                  <p>
                    <strong>Jumlah Order:</strong> {selectedDetail.summary.totalOrders}
                  </p>
                </div>
                <h3 className="text-lg font-semibold mb-2">Detail Order</h3>
                {selectedDetail.details.length > 0 ? (
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        <th className="border px-2 py-1">Order ID</th>
                        <th className="border px-2 py-1">Tanggal</th>
                        <th className="border px-2 py-1">Nama Menu/Bundle</th>
                        <th className="border px-2 py-1">Jumlah Pembelian</th>
                        <th className="border px-2 py-1">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDetail.details.map((item, index) => (
                        <tr key={index}>
                          <td className="border px-2 py-1">{item.orderId}</td>
                          <td className="border px-2 py-1">{new Date(item.orderDate).toLocaleDateString()}</td>
                          <td className="border px-2 py-1">{item.menuName}</td>
                          <td className="border px-2 py-1">{item.quantity}</td>
                          <td className="border px-2 py-1">{formatCurrency(item.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>Tidak ada detail order untuk kategori ini.</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
