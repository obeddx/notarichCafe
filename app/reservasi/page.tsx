"use client";
import { useState } from "react";

const ReservationForm = () => {
  const [form, setForm] = useState({
    namaCustomer: "",
    nomorKontak: "",
    selectedDateTime: "",
    jumlahTamu: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const now = new Date();
    const selectedTime = new Date(form.selectedDateTime);

    if (selectedTime < now) {
      alert("Tanggal dan waktu reservasi tidak boleh di masa lalu.");
      return;
    }

    // Format tanggal agar sesuai dengan DateTime di Prisma
    const formattedDateTime = selectedTime.toISOString(); 

    try {
      const response = await fetch("/api/reservasi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          namaCustomer: form.namaCustomer,
          nomorKontak: form.nomorKontak,
          tanggalReservasi: formattedDateTime, // Gunakan format DateTime
          jumlahTamu: Number(form.jumlahTamu), // Pastikan jumlah tamu dikirim sebagai angka
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal menyimpan reservasi");
      }

      alert("Reservasi berhasil disimpan!");
      setForm({
        namaCustomer: "",
        nomorKontak: "",
        selectedDateTime: "",
        jumlahTamu: "",
      });
    } catch (error) {
      console.error("Error:", error);
      alert("Terjadi kesalahan saat menyimpan reservasi.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg mt-24 p-4">
      <div>
        <label className="block text-sm font-medium">Nama Customer</label>
        <input
          type="text"
          name="namaCustomer"
          value={form.namaCustomer}
          onChange={handleChange}
          className="border p-2 w-full rounded"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Nomor Kontak</label>
        <input
          type="text"
          name="nomorKontak"
          value={form.nomorKontak}
          onChange={handleChange}
          className="border p-2 w-full rounded"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Tanggal & Waktu Reservasi</label>
        <input
          type="datetime-local"
          name="selectedDateTime"
          value={form.selectedDateTime}
          min={new Date().toISOString().slice(0, 16)} // Mencegah input masa lalu
          onChange={handleChange}
          className="border p-2 w-full rounded"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Jumlah Tamu</label>
        <input
          type="number"
          name="jumlahTamu"
          value={form.jumlahTamu}
          onChange={handleChange}
          className="border p-2 w-full rounded"
          required
        />
      </div>

      <button type="submit" className="bg-blue-500 text-white p-2 rounded w-full">
        Buat Reservasi
      </button>
    </form>
  );
};

export default ReservationForm;
