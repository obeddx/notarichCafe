"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function ScanPage() {
  const [error, setError] = useState<string | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const initialized = useRef(false);
  const router = useRouter();
  const pathname = usePathname(); // Gunakan untuk mendapatkan path saat ini

  useEffect(() => {
    console.log("📌 Navigated to /scan");

    if (initialized.current || scannerActive) {
      console.log("⚠️ Scanner already initialized, skipping...");
      return;
    }

    initialized.current = true;
    setScannerActive(true);
    console.log("✅ Creating new scanner...");

    scannerRef.current = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
    scannerRef.current.render(
      (decodedText) => {
        console.log("📸 QR Code Scanned:", decodedText);
        try {
          const url = new URL(decodedText);
          const tableNumber = new URLSearchParams(url.search).get("table");

          if (tableNumber) {
            sessionStorage.setItem("tableNumber", tableNumber);
            router.push(`/menu?table=${tableNumber}`);
          } else {
            setError("Invalid QR Code format.");
          }
        } catch {
          setError("Failed to process QR Code.");
        }
      },
      (err) => {
        if (typeof err === "string") {
          if (err !== "NotFoundException") {
            setError("Scanning error: " + err);
          }
        } else if (typeof err === "object" && err !== null && "name" in err) {
          if ((err as { name: string }).name !== "NotFoundException") {
            setError("Scanning error: " + JSON.stringify(err));
          }
        }
      }
    );

    return () => {
      console.log("🧹 Cleaning up scanner...");
      if (scannerRef.current) {
        scannerRef.current.clear()
          .then(() => console.log("✅ Scanner cleared"))
          .catch(console.error);
        scannerRef.current = null;
        initialized.current = false;
        setScannerActive(false);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Scan Your Table QR Code</h1>
      {/* Scanner Container */}
      <div id="reader" key={pathname} className="w-64 h-64 border border-gray-400"></div>
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
}
