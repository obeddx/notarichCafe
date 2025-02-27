import { useState } from "react";
import toast from "react-hot-toast";

function CombinedPaymentForm({
  total = 0,
  details = { subtotal: 0, modifier: 0, discount: 0, tax: 0, gratuity: 0 },
  onConfirmPayment,
  onCancel,
}: {
  total?: number;
  details?: { subtotal: number; modifier: number; discount: number; tax: number; gratuity: number };
  onConfirmPayment: (paymentMethod: string, paymentId?: string, cashGiven?: number, change?: number) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<string>("tunai");
  const [paymentId, setPaymentId] = useState<string>("");
  const [cashGiven, setCashGiven] = useState<string>("");
  const [change, setChange] = useState<number>(0);

  const calculateChange = (given: string) => {
    const givenNumber = parseFloat(given) || 0;
    const changeAmount = givenNumber - total;
    setChange(changeAmount >= 0 ? changeAmount : 0);
    return changeAmount >= 0 ? changeAmount : 0;
  };

  const handleCashGivenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^[0-9]*\.?[0-9]*$/.test(value)) {
      setCashGiven(value);
      calculateChange(value);
    }
  };

  const handleConfirmPayment = () => {
    if (paymentMethod === "tunai") {
      const cashGivenNumber = parseFloat(cashGiven) || 0;
      if (cashGivenNumber < total) {
        toast.error("Uang yang diberikan kurang");
        return;
      }
      onConfirmPayment(paymentMethod, undefined, cashGivenNumber, change);
    } else {
      onConfirmPayment(paymentMethod, paymentId, undefined, undefined);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Pembayaran Gabungan</h2>
        <div className="mb-4">
          <p className="text-lg font-semibold">Rincian Pembayaran Gabungan:</p>
          <div className="text-gray-700 space-y-1">
            <p>Subtotal: Rp {details.subtotal.toLocaleString()}</p>
            <p>Modifier: Rp {details.modifier.toLocaleString()}</p>
            <p>Diskon: Rp {details.discount.toLocaleString()}</p>
            <p>Subtotal setelah diskon: Rp {(details.subtotal + details.modifier - details.discount).toLocaleString()}</p>
            <p>Pajak (10%): Rp {details.tax.toLocaleString()}</p>
            <p>Gratuity (2%): Rp {details.gratuity.toLocaleString()}</p>
            <p className="text-lg font-bold text-[#4CAF50]">
              Total yang harus dibayar: Rp {total.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Form metode pembayaran */}
        <select
          value={paymentMethod}
          onChange={(e) => {
            setPaymentMethod(e.target.value);
            setCashGiven("");
            setChange(0);
          }}
          className="w-full p-2 border border-gray-300 rounded-md mb-4"
        >
          <option value="tunai">Tunai</option>
          <option value="kartu">Kartu Kredit/Debit</option>
          <option value="e-wallet">E-Wallet</option>
        </select>

        {/* Input ID Pembayaran (untuk non-tunai) */}
        {paymentMethod !== "tunai" && (
          <input
            type="text"
            placeholder="Masukkan ID Pembayaran"
            value={paymentId}
            onChange={(e) => setPaymentId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md mb-4"
          />
        )}

        {/* Input Uang yang Diberikan (untuk tunai) */}
        {paymentMethod === "tunai" && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Uang yang Diberikan</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*\.?[0-9]*"
              placeholder="Masukkan jumlah uang"
              value={cashGiven}
              onChange={handleCashGivenChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
            {cashGiven && change > 0 && (
              <p className="text-green-600 mt-2">Kembalian: Rp {change.toLocaleString()}</p>
            )}
            {cashGiven && change < 0 && (
              <p className="text-red-600 mt-2">Uang yang diberikan kurang: Rp {(-change).toLocaleString()}</p>
            )}
          </div>
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