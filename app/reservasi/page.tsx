
"use client";
import { useState, useEffect } from "react";
import html2canvas from "html2canvas";
import Image from "next/image";
import moment from "moment-timezone";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaUser, FaPhone, FaCalendarAlt, FaUsers, FaClock, FaChair } from "react-icons/fa";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';


const addHours = (date: string, hours: number) => {
  const newDate = new Date(date);
  newDate.setHours(newDate.getHours() + hours);
  return newDate.toISOString();
};

const ReservationForm = () => {
  // Tambahkan kode untuk membaca query parameter
  const searchParams = useSearchParams();
  const selectedMeja = searchParams.get('meja');

  // Modifikasi state awal untuk meja
  const [form, setForm] = useState({
    namaCustomer: "",
    nomorKontak: "",
    selectedDateTime: "",
    jumlahTamu: "",
    durasiJam: 1,
    durasiMenit: 10,
    meja: selectedMeja || "", // Gunakan nilai dari query parameter
  });

  useEffect(() => {
    if (selectedMeja) {
      setForm(prev => ({ ...prev, meja: selectedMeja }));
    }
  }, [selectedMeja]);
  const [kodeBooking, setKodeBooking] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const formatKodeBooking = (kode: string) => {
    const regex = /^RESV-(\d{2})(\d{2})(\d{4})-(\w{5})$/;
    const match = kode.match(regex);
    if (match) {
      const [, day, month, year, random] = match;
      return `RESV-${day}/${month}/${year}-${random}`;
    }
    return kode;
  };

  const getMinDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  const isValidTime = (selectedTime: string) => {
    const time = new Date(selectedTime).getHours();
    return time >= 10 && time < 22;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const updatedForm = { ...prev, [name]: name === "durasiMenit" || name === "durasiJam" ? Number(value) : value };

      if (name === "durasiJam" && updatedForm.durasiJam === 2) {
        updatedForm.durasiMenit = 0;
      }

      if (name === "durasiJam" && updatedForm.durasiJam === 1 && updatedForm.durasiMenit === 0) {
        updatedForm.durasiMenit = 10;
      }

      return updatedForm;
    });
  };

  const captureAndDownloadReservationDetails = (kodeBooking: string) => {
    const element = document.getElementById("reservationDetails");
    if (!element) {
      console.error("Elemen detail reservasi tidak ditemukan!");
      return;
    }
    html2canvas(element, { backgroundColor: null, useCORS: true }).then((canvas) => {
      const dataUrl = canvas.toDataURL("/logo-notarich-transparent.png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `Reservasi_${form.namaCustomer || "Tanpa_Nama"}_${kodeBooking}.png`;
      link.click();
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const now = new Date();
    const selectedTime = new Date(form.selectedDateTime);
    if (selectedTime < now) {
      toast.error("Tanggal dan waktu reservasi tidak boleh di masa lalu.");
      setIsSubmitting(false);
      return;
    }

    if (!isValidTime(form.selectedDateTime)) {
      toast.error("Jam reservasi harus antara 10:00 - 22:00.");
      setIsSubmitting(false);
      return;
    }

    // Validasi jumlah tamu dengan kapasitas meja
    // const mejaDipilih = layoutMeja.find((meja) => meja.id === form.meja);
    // if (mejaDipilih && Number(form.jumlahTamu) > mejaDipilih.kapasitas) {
    //   toast.error(`Jumlah tamu melebihi kapasitas meja ${mejaDipilih.nama} (Maksimal: ${mejaDipilih.kapasitas})`);
    //   setIsSubmitting(false);
    //   return;
    // }

    const totalDurasi = Number(form.durasiJam) * 60 + Number(form.durasiMenit);

    const day = String(selectedTime.getDate()).padStart(2, "0");
    const month = String(selectedTime.getMonth() + 1).padStart(2, "0");
    const year = String(selectedTime.getFullYear());

    const newKodeBooking = `RESV-${day}${month}${year}-${Math.random()
      .toString(36)
      .substring(2, 7)
      .toUpperCase()}`;

    setKodeBooking(newKodeBooking);

    const adjustedDateTime = addHours(form.selectedDateTime, 7);

    const formattedDateTime = moment(adjustedDateTime).tz("Asia/Jakarta").format();

    const requestData = {
      namaCustomer: form.namaCustomer,
      nomorKontak: form.nomorKontak,
      tanggalReservasi: formattedDateTime,
      jumlahTamu: Number(form.jumlahTamu),
      durasiPemesanan: totalDurasi,
      nomorMeja: form.meja, // Gunakan meja yang dipilih
      kodeBooking: newKodeBooking,
    };

    console.log("Data dikirim ke API:", requestData);

    try {
      const response = await fetch("/api/reservasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorMessage = await response.json();
        throw new Error(errorMessage.message || "Gagal menyimpan reservasi");
      }

      toast.success(`Reservasi berhasil disimpan! Kode Booking: ${newKodeBooking}`);

      captureAndDownloadReservationDetails(newKodeBooking);

      setForm({
        namaCustomer: "",
        nomorKontak: "",
        selectedDateTime: "",
        jumlahTamu: "",
        durasiJam: 1,
        durasiMenit: 10,
        meja: "", // Reset meja
      });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Terjadi kesalahan saat menyimpan reservasi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-50 to-blue-50 flex items-center justify-center p-4 pt-7">
      <ToastContainer position="top-center" autoClose={3000} />
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-2xl w-full sm:w-96 transform transition-all hover:scale-105">
        <div className="text-center mb-6">
          <Image
            src="/logo-notarich-transparent.png"
            alt="Logo NotarichCafe"
            width={150}
            height={150}
            className="mx-auto"
          />
        </div>

        <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">Reservasi Meja</h2>

        <div className="space-y-4">
        <div className="relative">
            <label className="block text-sm font-medium text-gray-600">Pilih Meja</label>
            <div className="relative">
              <FaChair className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              {/* <p>Pilih Meja</p> */}
        <Link href="/reservasi/layoutCafe">
          <button className="pl-12 btn btn-primary">Pilih Meja</button>
        </Link>
            </div>
          </div>
          
          {/* Form Nama Customer */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-600">Nama Customer</label>
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

          {/* Form Nomor Kontak */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-600">Nomor Kontak (Whatsapp)</label>
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

          {/* Form Tanggal & Waktu Reservasi */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-600">Tanggal & Waktu Reservasi : 10:00 - 22:00</label>
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

          {/* Form Pilih Meja */}
         

          {/* Form Nomor Meja */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-600">Nomor Meja</label>
          <div className="relative">
            <FaChair className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="nomorMeja"
              value={form.meja} // Menggunakan nilai meja yang dipilih
              onChange={handleChange}
              className="border border-gray-300 p-2 pl-10 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              readOnly
            />
          </div>
        </div>

          {/* Form Jumlah Tamu */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-600">Jumlah Tamu</label>
            <div className="relative">
              <FaUsers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                name="jumlahTamu"
                value={form.jumlahTamu}
                onChange={handleChange}
                className="border border-gray-300 p-2 pl-10 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                required
                placeholder="Jumlah tamu"
                min="1"
              />
            </div>
          </div>

          {/* Form Durasi Pemesanan */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-600">Durasi Pemesanan</label>
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

          {/* Tombol Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 text-white p-3 rounded-md w-full mt-4 hover:bg-blue-700 transition-all transform hover:scale-105 flex items-center justify-center"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              "Buat Reservasi"
            )}
          </button>
        </div>
      </form>

      {/* Detail Reservasi */}
       <div
        id="reservationDetails"
        className="mt-6 p-4 border rounded-lg bg-white shadow-2xl w-full sm:w-96 mx-auto transform transition-all hover:scale-105"
        style={{
          width: "384px", // Sama dengan sm:w-96 (96 * 4 = 384px)
          minHeight: "500px", // Tinggi minimum
        }}
      >
        {/* Menggunakan <img> biasa agar html2canvas dapat menangkapnya dengan benar */}
        <img
          src="/logo-notarich-transparent.png"
          alt="Logo NotarichCafe"
          className="mx-auto"
          style={{ width: "100%", height: "auto" }}
        />
        <h3 className="text-lg font-bold text-gray-800 text-center mb-4">Detail Reservasi</h3>
        <p>
          <strong>Nama :</strong> {form.namaCustomer}
        </p>
        <p>
          <strong>Tanggal & Waktu:</strong>{" "}
          {form.selectedDateTime ? formatTanggalForKode(form.selectedDateTime) : "-"}
        </p>
        <p>
          <strong>Jumlah Tamu :</strong> {form.jumlahTamu}
        </p>
        <p>
          <strong>Meja :</strong> {form.meja || "1A"}
        </p>
        <p>
          <strong>Durasi :</strong> {form.durasiJam} Jam {form.durasiMenit} Menit
        </p>
        <p>
          <strong>Kode Booking :</strong> {formatKodeBooking(kodeBooking)}
        </p>
      </div>
    </div>
  );
};

export default ReservationForm;