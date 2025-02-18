import { useState } from "react";

function CombinedPaymentForm({
    total = 0,
  onConfirmPayment,
  onCancel,
}: {
    total?: number;
  onConfirmPayment: (paymentMethod: string, paymentId?: string) => void;
  onCancel: () => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<string>("tunai");
  const [paymentId, setPaymentId] = useState<string>("");

  const handleConfirmPayment = () => {
    onConfirmPayment(paymentMethod, paymentId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Pembayaran Gabungan</h2>

        {/* Tampilkan total harga gabungan */}
{/* Tampilkan total harga gabungan */}
<div className="mb-4">
  <p className="text-lg font-semibold">
    Total yang harus dibayar:
  </p>
  <p className="text-2xl text-[#4CAF50] font-bold">
  Rp {(total ?? 0).toLocaleString()}
  </p>
</div>

        {/* Form metode pembayaran */}
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md mb-4"
        >
          <option value="tunai">Tunai</option>
          <option value="kartu">Kartu Kredit/Debit</option>
          <option value="e-wallet">E-Wallet</option>
        </select>
        {paymentMethod !== "tunai" && (
          <input
            type="text"
            placeholder="Masukkan ID Pembayaran"
            value={paymentId}
            onChange={(e) => setPaymentId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md mb-4"
          />
        )}

        {/* Tombol aksi */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md"
          >
            Batal
          </button>
          <button
            onClick={handleConfirmPayment}
            className="px-4 py-2 bg-[#4CAF50] hover:bg-[#45a049] text-white rounded-md"
          >
            Konfirmasi Pembayaran
          </button>
        </div>
      </div>
    </div>
  );
}

export default CombinedPaymentForm;