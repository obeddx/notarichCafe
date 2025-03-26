"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import CryptoJS from "crypto-js";

export default function ScanPage() {
  const [error, setError] = useState<string | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const initialized = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  const secretKey = "your-secret-key-here"; // Tetap disertakan meskipun tidak digunakan di sini

  useEffect(() => {
    console.log(":pushpin: Navigated to /scan");

    if (initialized.current || scannerActive) {
      console.log(":warning: Scanner already initialized, skipping...");
      return;
    }

    initialized.current = true;
    setScannerActive(true);
    console.log(":white_check_mark: Creating new scanner...");

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      disableFlip: false,
      rememberLastUsedCamera: true,
    };

    scannerRef.current = new Html5QrcodeScanner("reader", config, false);

    scannerRef.current.render(
      (decodedText) => {
        console.log(":camera_with_flash: QR Code Scanned:", decodedText);
        try {
          const url = new URL(decodedText);
          const encryptedTable = new URLSearchParams(url.search).get("table");

          if (encryptedTable) {
            // Simpan nilai terenkripsi langsung tanpa dekripsi
            sessionStorage.setItem("tableNumber", encryptedTable);
            // Redirect dengan nilai terenkripsi
            router.push(`/menu?table=${encryptedTable}`);
          } else {
            setError("Invalid QR Code format - no table parameter found.");
          }
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          setError("Failed to process QR Code: " + errorMessage);
        }
      },
      (err: unknown) => {
        if (err instanceof Error) {
          if (err.name !== "NotFoundException") {
            console.error("Scanning error:", err);
            setError(`Scanning error: ${err.message}`);
          }
        } else if (typeof err === "string" && err !== "NotFoundException") {
          console.error("Scanning error:", err);
          setError(`Scanning error: ${err}`);
        }
      }
    );

    return () => {
      console.log(":broom: Cleaning up scanner...");
      if (scannerRef.current) {
        scannerRef.current
          .clear()
          .then(() => console.log(":white_check_mark: Scanner cleared"))
          .catch(console.error);
        scannerRef.current = null;
        initialized.current = false;
        setScannerActive(false);
      }
    };
  }, [router, pathname]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Scan Your Table QR Code</h1>
      <div id="reader" className="w-64 h-64 border border-gray-400"></div>
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
}
