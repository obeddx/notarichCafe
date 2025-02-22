// components/ExportButton.tsx
"use client";
import { useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable"; // Pastikan modul ini terinstall

interface ExportButtonProps {
  data: any[]; // Data tabel berupa array objek
  columns: { header: string; key: string }[]; // Konfigurasi kolom: header dan key untuk data
  fileName: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ data, columns, fileName }) => {
  const [open, setOpen] = useState(false);

  const toggleDropdown = () => {
    setOpen(!open);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  const exportToPdf = () => {
    const doc = new jsPDF();
    const headers = [columns.map(col => col.header)];
    const body = data.map(row => columns.map(col => row[col.key]));
    // Gunakan cast ke any untuk menghindari error TypeScript
    (doc as any).autoTable({
      head: headers,
      body: body,
    });
    doc.save(`${fileName}.pdf`);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={toggleDropdown}
        className="bg-blue-500 text-white px-4 py-2 rounded shadow"
      >
        Export
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-md z-10">
          <button
            onClick={() => { exportToPdf(); setOpen(false); }}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
          >
            Export PDF
          </button>
          <button
            onClick={() => { exportToExcel(); setOpen(false); }}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
          >
            Export Excel
          </button>
        </div>
      )}
    </div>
  );
};
