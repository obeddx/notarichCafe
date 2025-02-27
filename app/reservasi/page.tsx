"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaUser, FaPhone, FaCalendarAlt, FaClock, FaChair } from "react-icons/fa";
import { useSearchParams } from "next/navigation";

const ReservationForm = () => {
  const searchParams = useSearchParams();
  const selectedMeja = searchParams?.get("meja") || "";
  const router = useRouter();

  const [form, setForm] = useState({
    namaCustomer: "",
    nomorKontak: "",
    selectedDateTime: "",
    durasiJam: 1,
    durasiMenit: 10,
    meja: selectedMeja || "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update nomor meja dari query parameter jika ada
  useEffect(() => {
    if (selectedMeja) {
      setForm((prev) => ({ ...prev, meja: selectedMeja }));
    }
  }, [selectedMeja]);

  // Fungsi untuk mendapatkan tanggal minimum (hari ini)
  const getMinDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  // Validasi jam operasional (10:00 - 22:00)
  const isValidTime = (selectedTime: string) => {
    const time = new Date(selectedTime).getHours();
    return time >= 10 && time < 22;
  };

  // Handler untuk perubahan input form
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updatedForm = {
        ...prev,
        [name]: name === "durasiMenit" || name === "durasiJam" ? Number(value) : value,
      };

      // Atur durasi menit ke 0 jika durasi jam adalah 2
      if (name === "durasiJam" && updatedForm.durasiJam === 2) {
        updatedForm.durasiMenit = 0;
      }
      // Atur durasi menit ke 10 jika durasi jam adalah 1 dan menit sebelumnya 0
      if (name === "durasiJam" && updatedForm.durasiJam === 1 && updatedForm.durasiMenit === 0) {
        updatedForm.durasiMenit = 10;
      }

      return updatedForm;
    });
  };

  // Format tanggal untuk tampilan di Reservation Details
  const formatTanggalForKode = (date: string) => {
    const validDate = new Date(date);
    if (isNaN(validDate.getTime())) {
      return "-";
    }
    const day = String(validDate.getDate()).padStart(2, "0");
    const month = String(validDate.getMonth() + 1).padStart(2, "0");
    const year = String(validDate.getFullYear());
    const hours = String(validDate.getHours()).padStart(2, "0");
    const minutes = String(validDate.getMinutes()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // Format kode booking untuk tampilan yang lebih rapi
  const formatKodeBooking = (kode: string) => {
    const regex = /^RESV-(\d{2})(\d{2})(\d{4})-(\w{6})$/;
    const match = kode.match(regex);
    if (match) {
      const [, day, month, year, random] = match;
      return `RESV-${day}/${month}/${year}-${random}`;
    }
    return kode;
  };

  // Handler untuk submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const now = new Date();
    const selectedTime = new Date(form.selectedDateTime);

    // Validasi tanggal dan waktu tidak di masa lalu
    if (selectedTime < now) {
      toast.error("Tanggal dan waktu reservasi tidak boleh di masa lalu.");
      setIsSubmitting(false);
      return;
    }

    // Validasi jam operasional
    if (!isValidTime(form.selectedDateTime)) {
      toast.error("Jam reservasi harus antara 10:00 - 22:00.");
      setIsSubmitting(false);
      return;
    }

    // Hitung total durasi dalam menit
    const totalDurasi = Number(form.durasiJam) * 60 + Number(form.durasiMenit);

    // Generate kode booking di frontend
    const day = String(selectedTime.getDate()).padStart(2, "0");
    const month = String(selectedTime.getMonth() + 1).padStart(2, "0");
    const year = String(selectedTime.getFullYear());
    const kodeBooking = `RESV-${day}${month}${year}-${form.namaCustomer.slice(0, 3).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    // Simpan data reservasi ke sessionStorage
    const reservationData = {
      namaCustomer: form.namaCustomer,
      nomorKontak: form.nomorKontak,
      selectedDateTime: form.selectedDateTime,
      durasiJam: form.durasiJam,
      durasiMenit: form.durasiMenit,
      meja: form.meja, // Akan diisi di layout
      kodeBooking,
    };

    sessionStorage.setItem("reservationData", JSON.stringify(reservationData));

    // Redirect ke halaman layout café
    router.push("/reservasi/layoutCafe");
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-50 to-blue-50 flex flex-col items-center justify-center p-4 pt-7">
      <ToastContainer position="top-center" autoClose={3000} />
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-2xl w-full sm:w-96 transform transition-all hover:scale-105 mt-10">
        <div className="text-center mb-1">
          <Image
            src="/logo-notarich-transparent.png"
            alt="Logo NotarichCafe"
            width={150}
            height={150}
            className="mx-auto"
          />
        </div>

        <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
          Reservasi Meja
        </h2>

        <div className="space-y-4">
          {/* Nama Customer */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-600">
              Nama Customer
            </label>
            <div className="relative">
              <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="namaCustomer"
                value={form.namaCustomer}
                onChange={handleChange}
                className="border border-gray-300 p-2 pl-10 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                required
                placeholder="Nama lengkap Anda"
              />
            </div>
          </div>

          {/* Nomor Kontak */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-600">
              Nomor Kontak (Whatsapp)
            </label>
            <div className="relative">
              <FaPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                name="nomorKontak"
                value={form.nomorKontak}
                onChange={handleChange}
                className="border border-gray-300 p-2 pl-10 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                pattern="[0-9]{10,15}"
                required
                placeholder="Contoh: 082321568365"
              />
            </div>
          </div>

          {/* Tanggal & Waktu Reservasi */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-600">
              Tanggal & Waktu Reservasi: 10:00 - 22:00
            </label>
            <div className="relative">
              <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="datetime-local"
                name="selectedDateTime"
                value={form.selectedDateTime}
                min={`${getMinDate()}T10:00`}
                max={`9999-12-31T22:00`}
                onChange={handleChange}
                className="border border-gray-300 p-2 pl-10 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                required
              />
            </div>
          </div>

          {/* Nomor Meja (read-only) */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-600">
              Nomor Meja
            </label>
            <div className="relative">
              <FaChair className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="meja"
                value={form.meja}
                className="border border-gray-300 p-2 pl-10 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-100 cursor-not-allowed"
                readOnly
                placeholder="Pilih meja di langkah berikutnya"
              />
            </div>
          </div>

          {/* Durasi Pemesanan */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-600">
              Durasi Pemesanan
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <FaClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  name="durasiJam"
                  value={form.durasiJam}
                  onChange={handleChange}
                  className="border border-gray-300 p-2 pl-10 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  {[1, 2].map((hour) => (
                    <option key={hour} value={hour}>
                      {hour} Jam
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative flex-1">
                <select
                  name="durasiMenit"
                  value={form.durasiMenit}
                  onChange={handleChange}
                  className="border border-gray-300 p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  disabled={form.durasiJam === 2}
                >
                  {form.durasiJam === 1
                    ? [0, 10, 20, 30, 40, 50].map((minute) => (
                        <option key={minute} value={minute}>
                          {minute} Menit
                        </option>
                      ))
                    : [0].map((minute) => (
                        <option key={minute} value={minute}>
                          {minute} Menit
                        </option>
                      ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tombol Pilih Meja */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-blue-600 text-white p-3 rounded-md w-full mt-4 hover:bg-blue-700 transition-all transform hover:scale-105 flex items-center justify-center"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              "Pilih Meja"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReservationForm;