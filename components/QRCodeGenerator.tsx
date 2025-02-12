'use client';
import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

export default function QRCodeGenerator() {
  const [tableNumber, setTableNumber] = useState("");
  const baseUrl = "http://localhost:3000/menu"; // Tambahkan http:// agar bisa diakses


  const handleDownload = () => {
    const canvas = document.getElementById("qrCode") as HTMLCanvasElement;
    const pngUrl = canvas.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `table-${tableNumber}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div className="flex flex-col items-center gap-4 bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold">Generate QR Code</h2>
      <input
        type="number"
        className="border p-2 w-40 text-center text-black"
        placeholder="Masukkan Nomor Meja"
        value={tableNumber}
        onChange={(e) => setTableNumber(e.target.value)}
      />
      {tableNumber && (
        <>
          <QRCodeCanvas
            id="qrCode"
            value={`${baseUrl}?table=${tableNumber}`}
            size={200}
            bgColor="#ffffff"
            fgColor="#000000"
            includeMargin={true}
          />
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-md"
            onClick={handleDownload}
          >
            Download QR Code
          </button>
        </>
      )}
    </div>
  );
}
