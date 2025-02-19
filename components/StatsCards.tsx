// File: components/StatsCards.tsx
"use client";

import { useState, useEffect } from "react";

// ======= TIPE DATA =======
interface Metrics {
  totalSales: number;
  transactions: number;
  totalHPP: number;
  grossProfit: number;
  netProfit: number;
}

interface StatCardProps {
  title: string;
  value: string;
  percentage: string;
  icon: string;
  color: string;
  onClick?: () => void;
}

interface OrderItem {
  id: number;
  quantity: number;
  menu: {
    id: number;
    name: string;
    price: number;
    hargaBakul: number;
  };
}

interface Order {
  id: number;
  createdAt: string;
  total: number;
  orderItems: OrderItem[];
}

// Untuk modal, tambahkan properti metric agar modal tahu cara merender data
interface ModalData {
  title: string;
  metric: "sales" | "transactions" | "gross" | "net";
  summary?: {
    explanation: string;
    [key: string]: any;
  };
  data: any[]; // struktur data disesuaikan dengan metric
}

interface SalesDetailsModalProps {
  title: string;
  summary?: {
    explanation: string;
    [key: string]: any;
  };
  metric: "sales" | "transactions" | "gross" | "net";
  data: any[];
  onClose: () => void;
}

// ======= COMPONENT STAT CARD =======
const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  percentage,
  icon,
  color,
  onClick,
}) => (
  <div
    className="p-6 bg-white shadow-md rounded-xl flex items-center gap-4 transition-transform hover:scale-105 cursor-pointer"
    onClick={onClick}
  >
    <div className={`text-4xl ${color}`}>{icon}</div>
    <div>
      <div className="text-lg font-semibold text-[#212121]">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-500">{percentage}</div>
    </div>
  </div>
);

// ======= COMPONENT MODAL DETAIL PENJUALAN =======
const SalesDetailsModal: React.FC<SalesDetailsModalProps> = ({
  title,
  summary,
  metric,
  data,
  onClose,
}) => {
  // Fungsi untuk merender header tabel sesuai metric
  const renderTableHeader = () => {
    if (metric === "sales") {
      return (
        <tr>
          <th className="border p-2">Tanggal</th>
          <th className="border p-2">Total</th>
          <th className="border p-2">Items</th>
        </tr>
      );
    } else if (metric === "transactions") {
      return (
        <tr>
          <th className="border p-2">Tanggal</th>
          <th className="border p-2">Total</th>
          <th className="border p-2">Jumlah Item</th>
          <th className="border p-2">Menu</th>
        </tr>
      );
    } else if (metric === "gross" || metric === "net") {
      return (
        <tr>
          <th className="border p-2">Order ID</th>
          <th className="border p-2">Tanggal</th>
          <th className="border p-2">Menu</th>
          <th className="border p-2">Harga Jual</th>
          <th className="border p-2">Jumlah</th>
          <th className="border p-2">Total Sales</th>
          <th className="border p-2">HPP</th>
          <th className="border p-2">Total HPP</th>
        </tr>
      );
    }
  };

  // Fungsi untuk merender baris tabel sesuai metric
  const renderTableRows = () => {
    if (metric === "sales") {
      // Data bertipe Order[]
      return data.map((order: Order) => (
        <tr key={order.id}>
          <td className="border p-2">
            {new Date(order.createdAt).toLocaleDateString()}
          </td>
          <td className="border p-2">Rp {Number(order.total).toLocaleString()}</td>
          <td className="border p-2">
            {order.orderItems.map((item: OrderItem) => (
              <div key={item.id}>
                {item.menu.name} x{item.quantity}
              </div>
            ))}
          </td>
        </tr>
      ));
    } else if (metric === "transactions") {
      // Data berisi ringkasan transaksi: { id, createdAt, total, itemCount, menus }
      return data.map(
        (tx: { id: number; createdAt: string; total: number; itemCount: number; menus: string[] }) => (
          <tr key={tx.id}>
            <td className="border p-2">{new Date(tx.createdAt).toLocaleDateString()}</td>
            <td className="border p-2">Rp {Number(tx.total).toLocaleString()}</td>
            <td className="border p-2">{tx.itemCount}</td>
            <td className="border p-2">{tx.menus.join(", ")}</td>
          </tr>
        )
      );
    } else if (metric === "gross" || metric === "net") {
      // Data berisi detail tiap item: { orderId, orderDate, menuName, sellingPrice, quantity, itemTotalSelling, hpp, itemTotalHPP }
      return data.map((item: any, index: number) => (
        <tr key={index}>
          <td className="border p-2">{item.orderId}</td>
          <td className="border p-2">
            {new Date(item.orderDate).toLocaleDateString()}
          </td>
          <td className="border p-2">{item.menuName}</td>
          <td className="border p-2">
            Rp {Number(item.sellingPrice).toLocaleString()}
          </td>
          <td className="border p-2">{item.quantity}</td>
          <td className="border p-2">
            Rp {Number(item.itemTotalSelling).toLocaleString()}
          </td>
          <td className="border p-2">Rp {Number(item.hpp).toLocaleString()}</td>
          <td className="border p-2">
            Rp {Number(item.itemTotalHPP).toLocaleString()}
          </td>
        </tr>
      ));
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg w-11/12 max-h-screen overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            &times;
          </button>
        </div>
        {/* Tampilkan ringkasan jika ada */}
        {summary && (
          <div className="mb-4 p-4 bg-gray-100 rounded">
            <p className="mb-2">
              <strong>Info:</strong> {summary.explanation}
            </p>
            {Object.keys(summary)
              .filter((key) => key !== "explanation")
              .map((key) => (
                <p key={key}>
                  <strong>{key}:</strong> {summary[key]}
                </p>
              ))}
          </div>
        )}
        <table className="w-full">
          <thead>{renderTableHeader()}</thead>
          <tbody>{renderTableRows()}</tbody>
        </table>
      </div>
    </div>
  );
};

// ======= HELPER: HITUNG TANGGAL SEBELUMNYA =======
function getPreviousDate(
  dateString: string,
  period: "daily" | "weekly" | "monthly" | "yearly"
): string {
  const date = new Date(dateString);
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
  return date.toISOString();
}

// ======= COMPONENT UTAMA: STATS CARDS =======
export default function StatsCards() {
  // State pilihan periode dan tanggal
  const [selectedPeriod, setSelectedPeriod] = useState<
    "daily" | "weekly" | "monthly" | "yearly"
  >("daily");
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  const [currentMetrics, setCurrentMetrics] = useState<Metrics | null>(null);
  const [previousMetrics, setPreviousMetrics] = useState<Metrics | null>(null);

  // State modal detail
  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ======= FETCH METRICS PERIODE SAAT INI =======
  useEffect(() => {
    async function fetchCurrentMetrics() {
      try {
        const res = await fetch(
          `/api/sales-metrics?period=${selectedPeriod}&date=${selectedDate}`
        );
        const data = await res.json();
        setCurrentMetrics(data);
      } catch (error) {
        console.error("Error fetching current metrics:", error);
      }
    }
    fetchCurrentMetrics();
  }, [selectedPeriod, selectedDate]);

  // ======= FETCH METRICS PERIODE SEBELUMNYA =======
  useEffect(() => {
    async function fetchPreviousMetrics() {
      try {
        const previousDate = getPreviousDate(selectedDate, selectedPeriod);
        const res = await fetch(
          `/api/sales-metrics?period=${selectedPeriod}&date=${previousDate}`
        );
        const data = await res.json();
        setPreviousMetrics(data);
      } catch (error) {
        console.error("Error fetching previous metrics:", error);
      }
    }
    fetchPreviousMetrics();
  }, [selectedPeriod, selectedDate]);

  // Fungsi hitung persentase perubahan
  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? "100.00%" : "0.00%";
    const change = ((current - previous) / previous) * 100;
    return `${change.toFixed(2)}%`;
  };

  // Handler saat klik salah satu stat card
  const handleCardClick = async (type: string) => {
    try {
      const res = await fetch(
        `/api/sales-details?metric=${type}&period=${selectedPeriod}&date=${selectedDate}`
      );
      const response = await res.json(); // Response: { summary, details }
      let title = "";
      switch (type) {
        case "sales":
          title = "Detail Total Penjualan";
          break;
        case "transactions":
          title = "Detail Transaksi";
          break;
        case "gross":
          title = "Detail Laba Kotor";
          break;
        case "net":
          title = "Detail Laba Bersih";
          break;
        default:
          title = "Detail Penjualan";
      }
      // Set modalData dengan properti metric agar modal tahu cara render data
      setModalData({
        title,
        metric: type as "sales" | "transactions" | "gross" | "net",
        summary: response.summary,
        data: response.details,
      });
      setModalVisible(true);
    } catch (error) {
      console.error("Error fetching detail data:", error);
    }
  };

  return (
    <div>
      {/* Pilihan periode dan tanggal */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <div>
          <label htmlFor="period" className="mr-2 text-[#212121] font-medium">
            Pilih Periode:
          </label>
          <select
            id="period"
            value={selectedPeriod}
            onChange={(e) =>
              setSelectedPeriod(
                e.target.value as "daily" | "weekly" | "monthly" | "yearly"
              )
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
          <label htmlFor="date" className="text-[#212121] font-medium">
            Pilih Tanggal:
          </label>
          <input
            id="date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-2 border rounded bg-[#FFFAF0] text-[#212121] shadow-sm"
          />
        </div>
      </div>

      {/* Menampilkan stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {currentMetrics && previousMetrics && (
          <>
            <StatCard
              title="Total Penjualan"
              value={`Rp ${currentMetrics.totalSales.toLocaleString()}`}
              percentage={getPercentageChange(
                currentMetrics.totalSales,
                previousMetrics.totalSales
              )}
              icon="💰"
              color="text-green-500"
              onClick={() => handleCardClick("sales")}
            />
            <StatCard
              title="Transaksi"
              value={currentMetrics.transactions.toLocaleString()}
              percentage={getPercentageChange(
                currentMetrics.transactions,
                previousMetrics.transactions
              )}
              icon="📦"
              color="text-blue-500"
              onClick={() => handleCardClick("transactions")}
            />
            <StatCard
              title="Laba Kotor"
              value={`Rp ${currentMetrics.grossProfit.toLocaleString()}`}
              percentage={getPercentageChange(
                currentMetrics.grossProfit,
                previousMetrics.grossProfit
              )}
              icon="📈"
              color="text-purple-500"
              onClick={() => handleCardClick("gross")}
            />
            <StatCard
              title="Laba Bersih"
              value={`Rp ${currentMetrics.netProfit.toLocaleString()}`}
              percentage={getPercentageChange(
                currentMetrics.netProfit,
                previousMetrics.netProfit
              )}
              icon="💵"
              color="text-pink-500"
              onClick={() => handleCardClick("net")}
            />
          </>
        )}
      </div>

      {/* Modal detail */}
      {modalVisible && modalData && (
        <SalesDetailsModal
          title={modalData.title}
          summary={modalData.summary}
          metric={modalData.metric}
          data={modalData.data}
          onClose={() => setModalVisible(false)}
        />
      )}
    </div>
  );
}
