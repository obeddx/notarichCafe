import QRCodeGenerator from "@/components/QRCodeGenerator";

export default function GenerateQRPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-black p-8">
      <h1 className="text-3xl font-bold mb-6">Generate QR Code Meja</h1>
      <QRCodeGenerator/>
    </div>
  );
}
