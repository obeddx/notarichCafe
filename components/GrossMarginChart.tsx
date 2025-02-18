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

export default function GrossMarginChart() {
    const [grossMarginData, setGrossMarginData] = useState<{ date: string; grossMargin: number }[]>([]);
    const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    useEffect(() => {
        async function fetchGrossMarginData() {
            try {
                let url = `/api/grossMarginData?period=${period}`;
                if (startDate && endDate) {
                    url += `&start=${startDate}&end=${endDate}`;
                }
                const res = await fetch(url);
                const data = await res.json();
                setGrossMarginData(data);
            } catch (error) {
                console.error("Error fetching gross margin data:", error);
            }
        }

        fetchGrossMarginData();
    }, [period, startDate, endDate]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        if (period === "daily") {
            return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
        } else if (period === "weekly") {
            const weekNumber = dateString.split("-W")[1];
            return `Minggu ke-${weekNumber}`;
        } else {
            return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
        }
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        const title = "Laporan Gross Margin";
        const headers = [["Tanggal", "Gross Margin (%)"]];

        const data = grossMarginData.map((item) => [
            formatDate(item.date),
            item.grossMargin.toFixed(2),
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

        doc.save("laporan_gross_margin.pdf");
    };

    const exportToExcel = () => {
        const data = grossMarginData.map((item) => ({
            Tanggal: formatDate(item.date),
            "Gross Margin (%)": item.grossMargin.toFixed(2),
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Gross Margin");

        XLSX.writeFile(workbook, "laporan_gross_margin.xlsx");
    };

    return (
        <div className="mt-8 p-6 bg-[#FCFFFC] shadow-lg rounded-xl">
            <h2 className="text-2xl font-bold mb-4 text-[#212121]">Grafik Gross Margin</h2>

            <div className="mb-6 flex flex-wrap gap-4">
                <div>
                    <label htmlFor="period" className="mr-2 text-[#212121] font-medium">Pilih Periode:</label>
                    <select
                        id="period"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as "daily" | "weekly" | "monthly")}
                        className="p-2 border rounded bg-[#FFFAF0] text-[#212121] shadow-sm"
                    >
                        <option value="daily">Harian</option>
                        <option value="weekly">Mingguan</option>
                        <option value="monthly">Bulanan</option>
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
                    className="px-4 py-2 bg-[#4CAF50] text-white rounded hover:bg-[#45a049] transition-all"
                >
                    Ekspor ke PDF
                </button>
                <button
                    onClick={exportToExcel}
                    className="px-4 py-2 bg-[#2196F3] text-white rounded hover:bg-[#1e88e5] transition-all"
                >
                    Ekspor ke Excel
                </button>
            </div>

            <ResponsiveContainer width="100%" height={400}>
                <BarChart
                    data={grossMarginData}
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
                        contentStyle={{ backgroundColor: "#FFFAF0", borderRadius: "8px", borderColor: "#4CAF50" }}
                        labelFormatter={(value) => `Tanggal: ${formatDate(value)}`}
                        formatter={(value) => {
                            if (typeof value === "number") {
                                return [`${value.toFixed(2)}%`, "Gross Margin"];
                            }
                            return [`${value}`, "Gross Margin"]; // Jika bukan number, tampilkan tanpa toFixed
                        }}
                    />
                    <Legend verticalAlign="top" align="right" iconType="circle" />
                    <Bar dataKey="grossMargin" fill="#4CAF50" radius={[8, 8, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}