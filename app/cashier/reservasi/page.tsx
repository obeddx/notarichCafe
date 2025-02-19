"use client";

import SidebarCashier from "@/components/sidebarCashier";
import { useState, useEffect } from "react";
import moment from "moment-timezone";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Reservasi {
  id: number;
  namaCustomer: string;
  nomorKontak: string;
  tanggalReservasi: string;
  jumlahTamu: number;
  durasiPemesanan: number; // dalam menit
  nomorMeja: string;
  kodeBooking: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ReservationFormData {
  namaCustomer: string;
  nomorKontak: string;
  tanggalReservasi: string; // format "YYYY-MM-DDTHH:mm"
  nomorMeja: string;
  jumlahTamu: number;
  durasiJam: number;
  durasiMenit: number;
  status: string;
  kodeBooking?: string; // untuk edit, simpan kodeBooking yang sudah ada
}

// Fungsi helper untuk mendapatkan minimal tanggal dan waktu (hari ini pukul 10:00)
const getMinDateTime = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const date = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}T10:00`;
};

const ReservasiSidebar = () => {
  const [reservasis, setReservasis] = useState<Reservasi[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // State untuk edit
  const [editingReservationId, setEditingReservationId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ReservationFormData>({
    namaCustomer: "",
    nomorKontak: "",
    tanggalReservasi: "",
    nomorMeja: "",
    jumlahTamu: 0,
    durasiJam: 1,
    durasiMenit: 0,
    status: "BOOKED",
    kodeBooking: "",
  });

  // State untuk tambah reservasi
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [addForm, setAddForm] = useState<ReservationFormData>({
    namaCustomer: "",
    nomorKontak: "",
    tanggalReservasi: "",
    nomorMeja: "",
    jumlahTamu: 0,
    durasiJam: 1,
    durasiMenit: 0,
    status: "BOOKED",
  });

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  

  const fetchReservasis = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reservasi");
      if (!res.ok) {
        throw new Error("Gagal mengambil data");
      }
      const data: Reservasi[] = await res.json();
      // Urutkan berdasarkan tanggal reservasi (dari yang paling dekat dengan hari ini)
      const sortedData = data.sort(
        (a, b) => new Date(a.tanggalReservasi).getTime() - new Date(b.tanggalReservasi).getTime()
      );
      setReservasis(sortedData);
    } catch (err) {
      console.error(err);
      setError("Gagal mengambil data reservasi");
    } finally {
      setLoading(false);
    }
  };
  

  // Panggil fetchReservasis saat komponen dimount dan setiap 10 detik untuk update otomatis
  useEffect(() => {
    fetchReservasis();
    const intervalId = setInterval(() => {
      fetchReservasis();
    }, 10000); // polling setiap 10 detik
    return () => clearInterval(intervalId);
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin menghapus reservasi ini?")) return;
    try {
      const res = await fetch(`/api/reservasi/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setReservasis((prev) => prev.filter((r) => r.id !== id));
        toast.success("Reservasi berhasil dihapus");
      } else {
        toast.error("Gagal menghapus reservasi");
      }
    } catch (error) {
      console.error(error);
      toast.error("Terjadi kesalahan saat menghapus reservasi");
    }
  };

  // Fungsi untuk mengubah nilai editForm
  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]:
        name === "jumlahTamu" ||
        name === "durasiJam" ||
        name === "durasiMenit"
          ? Number(value)
          : value,
    }));
  };

  // Mulai edit: mengisi editForm dengan data reservasi yang dipilih
  const startEditing = (reservation: Reservasi) => {
    setEditingReservationId(reservation.id);
    setEditForm({
      namaCustomer: reservation.namaCustomer,
      nomorKontak: reservation.nomorKontak,
      // Konversi tanggal dari ISO ke format input datetime-local (Asia/Jakarta)
      tanggalReservasi: moment
        .tz(reservation.tanggalReservasi, "Asia/Jakarta")
        .format("YYYY-MM-DDTHH:mm"),
      nomorMeja: reservation.nomorMeja,
      jumlahTamu: reservation.jumlahTamu,
      durasiJam: Math.floor(reservation.durasiPemesanan / 60),
      durasiMenit: reservation.durasiPemesanan % 60,
      status: reservation.status,
      kodeBooking: reservation.kodeBooking,
    });
  };

  const cancelEditing = () => {
    setEditingReservationId(null);
  };

  // Validasi: waktu tidak boleh di masa lalu dan harus antara 10:00 - 22:00
  const isValidReservationTime = (dateString: string) => {
    const now = new Date();
    const selected = new Date(dateString);
    if (selected < now) return false;
    const hour = selected.getHours();
    return hour >= 10 && hour < 22;
  };

  const handleSaveEdit = async (id: number) => {
    // Pengecekan bentrok reservasi (abaikan reservasi yang sedang diedit sendiri)
    const inputDateTime = editForm.tanggalReservasi; // format "YYYY-MM-DDTHH:mm"
    const conflict = reservasis.find((r) => {
      if (r.id === id) return false;
      const rDateTime = moment
        .tz(r.tanggalReservasi, "Asia/Jakarta")
        .format("YYYY-MM-DDTHH:mm");
      return r.nomorMeja === editForm.nomorMeja && rDateTime === inputDateTime;
    });
    if (conflict) {
      toast.error("Meja sudah direservasi");
      return;
    }

    // Validasi waktu
    if (!isValidReservationTime(editForm.tanggalReservasi)) {
      toast.error("Pastikan tanggal & waktu tidak di masa lalu dan jam antara 10:00 - 22:00");
      return;
    }

    const totalDurasi = editForm.durasiJam * 60 + editForm.durasiMenit;
    const updatedData = {
      namaCustomer: editForm.namaCustomer,
      nomorKontak: editForm.nomorKontak,
      tanggalReservasi: new Date(editForm.tanggalReservasi).toISOString(),
      nomorMeja: editForm.nomorMeja,
      jumlahTamu: editForm.jumlahTamu,
      durasiPemesanan: totalDurasi,
      kodeBooking: editForm.kodeBooking,
      status: editForm.status,
    };

    try {
      const res = await fetch(`/api/reservasi/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
      if (!res.ok) {
        throw new Error("Gagal mengupdate reservasi");
      }
      const updatedReservation: Reservasi = await res.json();
      setReservasis((prev) =>
        prev.map((r) => (r.id === id ? updatedReservation : r))
      );
      setEditingReservationId(null);
      toast.success("Reservasi berhasil diupdate");
    } catch (error) {
      console.error(error);
      toast.error("Terjadi kesalahan saat mengupdate reservasi");
    }
  };

  // Fungsi untuk mengubah nilai addForm
  const handleAddChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setAddForm((prev) => ({
      ...prev,
      [name]:
        name === "jumlahTamu" ||
        name === "durasiJam" ||
        name === "durasiMenit"
          ? Number(value)
          : value,
    }));
  };

  const cancelAdding = () => {
    setIsAdding(false);
  };

  const handleSaveAdd = async () => {
    // Cek bentrok reservasi
    const inputDateTime = addForm.tanggalReservasi; // format "YYYY-MM-DDTHH:mm"
    const conflict = reservasis.find((r) => {
      const rDateTime = moment
        .tz(r.tanggalReservasi, "Asia/Jakarta")
        .format("YYYY-MM-DDTHH:mm");
      return r.nomorMeja === addForm.nomorMeja && rDateTime === inputDateTime;
    });
    if (conflict) {
      toast.error("Meja sudah direservasi");
      return;
    }

    // Validasi waktu
    if (!isValidReservationTime(addForm.tanggalReservasi)) {
      toast.error("Pastikan tanggal & waktu tidak di masa lalu dan jam antara 10:00 - 22:00");
      return;
    }

    // Generate kode booking secara otomatis
    const now = new Date(addForm.tanggalReservasi);
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear());
    const newKodeBooking = `RESV-${day}${month}${year}-${Math.random()
      .toString(36)
      .substring(2, 7)
      .toUpperCase()}`;

    const totalDurasi = addForm.durasiJam * 60 + addForm.durasiMenit;

    const newReservation = {
      namaCustomer: addForm.namaCustomer,
      nomorKontak: addForm.nomorKontak,
      tanggalReservasi: new Date(addForm.tanggalReservasi).toISOString(),
      nomorMeja: addForm.nomorMeja,
      jumlahTamu: addForm.jumlahTamu,
      durasiPemesanan: totalDurasi,
      kodeBooking: newKodeBooking,
      status: "BOOKED",
    };

    try {
      const res = await fetch("/api/reservasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReservation),
      });
      if (!res.ok) {
        throw new Error("Gagal menambah reservasi");
      }
      const added: Reservasi = await res.json();
      setReservasis((prev) => [...prev, added]);
      setIsAdding(false);
      // Reset form tambah
      setAddForm({
        namaCustomer: "",
        nomorKontak: "",
        tanggalReservasi: "",
        nomorMeja: "",
        jumlahTamu: 0,
        durasiJam: 1,
        durasiMenit: 0,
        status: "BOOKED",
      });
      toast.success("Reservasi berhasil ditambahkan");
    } catch (error) {
      console.error(error);
      toast.error("Terjadi kesalahan saat menambah reservasi");
    }
  };

  // Opsi status untuk dropdown
  const statusOptions = [
    "BOOKED",
    "RESERVED",
    "OCCUPIED",
    "COMPLETED",
    "CANCELED",
  ];

  return (
    <div className="relative">
      {/* ToastContainer harus ada agar toast muncul */}
      <ToastContainer position="top-center" autoClose={3000} />

      {/* Sidebar */}
      <div
        className={`fixed h-full bg-[#2A2A2A] shadow-xl flex-shrink-0 transition-all duration-300 ${
          isSidebarOpen ? "w-64" : "w-20"
        }`}
      >
        <SidebarCashier isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      </div>

      {/* Konten Reservasi */}
      <div
        className={`p-4 pt-48 transition-all duration-300 ${
          isSidebarOpen ? "ml-64" : "ml-20"
        }`}
      >
        <h2 className="text-lg font-bold mb-4">Daftar Reservasi</h2>
        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="border px-2 py-1">Nama</th>
              <th className="border px-2 py-1">Nomor Kontak</th>
              <th className="border px-2 py-1">Tanggal</th>
              <th className="border px-2 py-1">Meja</th>
              <th className="border px-2 py-1">Jumlah Tamu</th>
              <th className="border px-2 py-1">Durasi</th>
              <th className="border px-2 py-1">Kode Booking</th>
              <th className="border px-2 py-1">Status</th>
              <th className="border px-2 py-1">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {/* Baris untuk reservasi yang sedang diedit */}
            {editingReservationId &&
              reservasis
                .filter((r) => r.id === editingReservationId)
                .map((r) => (
                  <tr key={r.id}>
                    <td className="border px-2 py-1">
                      <input
                        type="text"
                        name="namaCustomer"
                        value={editForm.namaCustomer}
                        onChange={handleEditChange}
                        className="w-full border p-1"
                      />
                    </td>
                    <td className="border px-2 py-1">
                      <input
                        type="text"
                        name="nomorKontak"
                        value={editForm.nomorKontak}
                        onChange={handleEditChange}
                        className="w-full border p-1"
                      />
                    </td>
                    <td className="border px-2 py-1">
                      <input
                        type="datetime-local"
                        name="tanggalReservasi"
                        value={editForm.tanggalReservasi}
                        onChange={handleEditChange}
                        className="w-full border p-1"
                        min={getMinDateTime()}
                      />
                    </td>
                    <td className="border px-2 py-1">
                      <input
                        type="text"
                        name="nomorMeja"
                        value={editForm.nomorMeja}
                        onChange={handleEditChange}
                        className="w-full border p-1"
                      />
                    </td>
                    <td className="border px-2 py-1">
                      <input
                        type="string"
                        name="jumlahTamu"
                        value={editForm.jumlahTamu}
                        onChange={handleEditChange}
                        className="w-full border p-1"
                        min="1"
                      />
                    </td>
                    <td className="border px-2 py-1 flex gap-1">
                      <select
                        name="durasiJam"
                        value={editForm.durasiJam}
                        onChange={handleEditChange}
                        className="border p-1"
                      >
                        {[1, 2].map((h) => (
                          <option key={h} value={h}>
                            {h} Jam
                          </option>
                        ))}
                      </select>
                      <select
                        name="durasiMenit"
                        value={editForm.durasiMenit}
                        onChange={handleEditChange}
                        className="border p-1"
                        disabled={editForm.durasiJam === 2}
                      >
                        {editForm.durasiJam === 1
                          ? [0, 10, 20, 30, 40, 50].map((m) => (
                              <option key={m} value={m}>
                                {m} Menit
                              </option>
                            ))
                          : [0].map((m) => (
                              <option key={m} value={m}>
                                {m} Menit
                              </option>
                            ))}
                      </select>
                    </td>
                    <td className="border px-2 py-1">{r.kodeBooking}</td>
                    <td className="border px-2 py-1">
                      <select
                        name="status"
                        value={editForm.status}
                        onChange={handleEditChange}
                        className="border p-1"
                      >
                        {statusOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border px-2 py-1 flex gap-1">
                      <button
                        className="bg-green-500 text-white px-2 py-1 rounded"
                        onClick={() => handleSaveEdit(r.id)}
                      >
                        Save
                      </button>
                      <button
                        className="bg-gray-500 text-white px-2 py-1 rounded"
                        onClick={cancelEditing}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}

            {/* Baris untuk reservasi yang tidak sedang diedit */}
            {reservasis.map((r) =>
              r.id !== editingReservationId ? (
                <tr key={r.id}>
                  <td className="border px-2 py-1">{r.namaCustomer}</td>
                  <td className="border px-2 py-1">{r.nomorKontak}</td>
                  <td className="border px-2 py-1">
                    {moment
                      .tz(r.tanggalReservasi, "Asia/Jakarta")
                      .format("DD/MM/YYYY HH:mm")}
                  </td>
                  <td className="border px-2 py-1">{r.nomorMeja}</td>
                  <td className="border px-2 py-1">{r.jumlahTamu}</td>
                  <td className="border px-2 py-1">
                    {Math.floor(r.durasiPemesanan / 60)} Jam {r.durasiPemesanan % 60} Menit
                  </td>
                  <td className="border px-2 py-1">{r.kodeBooking}</td>
                  <td className="border px-2 py-1">{r.status}</td>
                  <td className="border px-2 py-1 flex gap-2">
                    <button
                      className="bg-blue-500 text-white px-2 py-1 rounded"
                      onClick={() => startEditing(r)}
                    >
                      Edit
                    </button>
                    <button
                      className="bg-red-500 text-white px-2 py-1 rounded"
                      onClick={() => handleDelete(r.id)}
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ) : null
            )}

            {/* Baris untuk form tambah reservasi */}
            {isAdding && (
              <tr className="bg-green-50">
                <td className="border px-2 py-1">
                  <input
                    type="text"
                    name="namaCustomer"
                    value={addForm.namaCustomer}
                    onChange={handleAddChange}
                    className="w-full border p-1"
                    placeholder="Nama Customer"
                  />
                </td>
                <td className="border px-2 py-1">
                  <input
                    type="text"
                    name="nomorKontak"
                    value={addForm.nomorKontak}
                    onChange={handleAddChange}
                    className="w-full border p-1"
                    placeholder="Nomor Kontak"
                  />
                </td>
                <td className="border px-2 py-1">
                  <input
                    type="datetime-local"
                    name="tanggalReservasi"
                    value={addForm.tanggalReservasi}
                    onChange={handleAddChange}
                    className="w-full border p-1"
                    min={getMinDateTime()}
                  />
                </td>
                <td className="border px-2 py-1">
                  <input
                    type="text"
                    name="nomorMeja"
                    value={addForm.nomorMeja}
                    onChange={handleAddChange}
                    className="w-full border p-1"
                    placeholder="Nomor Meja"
                  />
                </td>
                <td className="border px-2 py-1">
                  <input
                    type="string"
                    name="jumlahTamu"
                    value={addForm.jumlahTamu}
                    onChange={handleAddChange}
                    className="w-full border p-1"
                    placeholder="Jumlah Tamu"
                    min="1"
                  />
                </td>
                <td className="border px-2 py-1 flex gap-1">
                  <select
                    name="durasiJam"
                    value={addForm.durasiJam}
                    onChange={handleAddChange}
                    className="border p-1"
                  >
                    {[1, 2].map((h) => (
                      <option key={h} value={h}>
                        {h} Jam
                      </option>
                    ))}
                  </select>
                  <select
                    name="durasiMenit"
                    value={addForm.durasiMenit}
                    onChange={handleAddChange}
                    className="border p-1"
                    disabled={addForm.durasiJam === 2}
                  >
                    {addForm.durasiJam === 1
                      ? [0, 10, 20, 30, 40, 50].map((m) => (
                          <option key={m} value={m}>
                            {m} Menit
                          </option>
                        ))
                      : [0].map((m) => (
                          <option key={m} value={m}>
                            {m} Menit
                          </option>
                        ))}
                  </select>
                </td>
                <td className="border px-2 py-1">Auto-generated</td>
                <td className="border px-2 py-1">BOOKED</td>
                <td className="border px-2 py-1 flex gap-1">
                  <button
                    className="bg-green-500 text-white px-2 py-1 rounded"
                    onClick={handleSaveAdd}
                  >
                    Save
                  </button>
                  <button
                    className="bg-gray-500 text-white px-2 py-1 rounded"
                    onClick={cancelAdding}
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {!isAdding && (
          <button
            className="mt-4 bg-green-500 text-white px-4 py-2 rounded"
            onClick={() => setIsAdding(true)}
          >
            Tambah Reservasi
          </button>
        )}
      </div>
    </div>
  );
};

export default ReservasiSidebar;
