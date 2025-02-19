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

  // Fungsi fetch data reservasi (dengan pengurutan berdasarkan tanggal terdekat)
  const fetchReservasis = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reservasi");
      if (!res.ok) {
        throw new Error("Gagal mengambil data");
      }
      const data: Reservasi[] = await res.json();
      // Urutkan data berdasarkan tanggal reservasi (dari yang paling dekat ke yang paling jauh)
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

  // Update data secara otomatis (polling setiap 10 detik)
  useEffect(() => {
    fetchReservasis();
    const intervalId = setInterval(() => {
      fetchReservasis();
    }, 10000);
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
        name === "jumlahTamu" || name === "durasiJam" || name === "durasiMenit"
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

  // Validasi waktu: tidak boleh di masa lalu dan harus antara 10:00 - 22:00
  const isValidReservationTime = (dateString: string) => {
    const now = new Date();
    const selected = new Date(dateString);
    if (selected < now) return false;
    const hour = selected.getHours();
    return hour >= 10 && hour < 22;
  };

  const handleSaveEdit = async (id: number) => {
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

    if (!isValidReservationTime(addForm.tanggalReservasi)) {
      toast.error("Pastikan tanggal & waktu tidak di masa lalu dan jam antara 10:00 - 22:00");
      return;
    }

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
      {/* Pastikan ToastContainer ada agar toast muncul */}
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
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Daftar Reservasi</h2>
        {/* Tampilkan status loading/error agar state loading & error dibaca */}
        {loading && <p className="text-blue-600 mb-4">Loading...</p>}
        {error && <p className="text-red-600 mb-4">{error}</p>}

        {/* Container tabel dengan desain card */}
        <div className="overflow-x-auto shadow-md rounded-lg bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium">Nama</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Nomor Kontak</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Tanggal</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Meja</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Jumlah Tamu</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Durasi</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Kode Booking</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-2 text-center text-sm font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {/* Baris untuk reservasi yang sedang diedit */}
              {editingReservationId &&
                reservasis
                  .filter((r) => r.id === editingReservationId)
                  .map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          name="namaCustomer"
                          value={editForm.namaCustomer}
                          onChange={handleEditChange}
                          className="w-full border p-1 rounded"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          name="nomorKontak"
                          value={editForm.nomorKontak}
                          onChange={handleEditChange}
                          className="w-full border p-1 rounded"
                          min="1"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="datetime-local"
                          name="tanggalReservasi"
                          value={editForm.tanggalReservasi}
                          onChange={handleEditChange}
                          className="w-full border p-1 rounded"
                          min={getMinDateTime()}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          name="nomorMeja"
                          value={editForm.nomorMeja}
                          onChange={handleEditChange}
                          className="w-full border p-1 rounded"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          name="jumlahTamu"
                          value={editForm.jumlahTamu}
                          onChange={handleEditChange}
                          className="w-full border p-1 rounded"
                          min="1"
                        />
                      </td>
                      <td className="px-4 py-2 flex gap-1">
                        <select
                          name="durasiJam"
                          value={editForm.durasiJam}
                          onChange={handleEditChange}
                          className="border p-1 rounded"
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
                          className="border p-1 rounded"
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
                      <td className="px-4 py-2">{r.kodeBooking}</td>
                      <td className="px-4 py-2">
                        <select
                          name="status"
                          value={editForm.status}
                          onChange={handleEditChange}
                          className="border p-1 rounded"
                        >
                          {statusOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2 flex gap-1 justify-center">
                        <button
                          className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition-all"
                          onClick={() => handleSaveEdit(r.id)}
                        >
                          Save
                        </button>
                        <button
                          className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 transition-all"
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
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{r.namaCustomer}</td>
                    <td className="px-4 py-2">{r.nomorKontak}</td>
                    <td className="px-4 py-2">
                      {moment
                        .tz(r.tanggalReservasi, "Asia/Jakarta")
                        .format("DD/MM/YYYY HH:mm")}
                    </td>
                    <td className="px-4 py-2">{r.nomorMeja}</td>
                    <td className="px-4 py-2">{r.jumlahTamu}</td>
                    <td className="px-4 py-2">
                      {Math.floor(r.durasiPemesanan / 60)} Jam {r.durasiPemesanan % 60} Menit
                    </td>
                    <td className="px-4 py-2">{r.kodeBooking}</td>
                    <td className="px-4 py-2">{r.status}</td>
                    <td className="px-4 py-2 flex gap-2 justify-center">
                      <button
                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-all"
                        onClick={() => startEditing(r)}
                      >
                        Edit
                      </button>
                      <button
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-all"
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
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      name="namaCustomer"
                      value={addForm.namaCustomer}
                      onChange={handleAddChange}
                      className="w-full border p-1 rounded"
                      placeholder="Nama Customer"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      name="nomorKontak"
                      value={addForm.nomorKontak}
                      onChange={handleAddChange}
                      className="w-full border p-1 rounded"
                      placeholder="Nomor Kontak"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="datetime-local"
                      name="tanggalReservasi"
                      value={addForm.tanggalReservasi}
                      onChange={handleAddChange}
                      className="w-full border p-1 rounded"
                      min={getMinDateTime()}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      name="nomorMeja"
                      value={addForm.nomorMeja}
                      onChange={handleAddChange}
                      className="w-full border p-1 rounded"
                      placeholder="Nomor Meja"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      name="jumlahTamu"
                      value={addForm.jumlahTamu}
                      onChange={handleAddChange}
                      className="w-full border p-1 rounded"
                      placeholder="Jumlah Tamu"
                      min="1"
                    />
                  </td>
                  <td className="px-4 py-2 flex gap-1">
                    <select
                      name="durasiJam"
                      value={addForm.durasiJam}
                      onChange={handleAddChange}
                      className="border p-1 rounded"
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
                      className="border p-1 rounded"
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
                  <td className="px-4 py-2">Auto-generated</td>
                  <td className="px-4 py-2">BOOKED</td>
                  <td className="px-4 py-2 flex gap-1 justify-center">
                    <button
                      className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition-all"
                      onClick={handleSaveAdd}
                    >
                      Save
                    </button>
                    <button
                      className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 transition-all"
                      onClick={cancelAdding}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!isAdding && (
          <button
            className="mt-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-md hover:bg-green-600 transition-all"
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
