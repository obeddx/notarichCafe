"use client";

import SidebarCashier from "@/components/sidebarCashier";
import { useState, useEffect } from "react";
import moment from "moment-timezone";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import io from "socket.io-client"; // Tambahkan impor ini
interface Reservasi {
  id: number;
  namaCustomer: string;
  nomorKontak: string;
  tanggalReservasi: string;
  durasiPemesanan: number;
  nomorMeja: string;
  kodeBooking: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ReservationFormData {
  namaCustomer: string;
  nomorKontak: string;
  tanggalReservasi: string;
  nomorMeja: string;
  durasiJam: number;
  durasiMenit: number;
  status: string;
  kodeBooking?: string;
}

const getMinDateTime = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const date = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}T10:00`;
};

const ReservasiSidebar = () => {
  const [reservasis, setReservasis] = useState<Reservasi[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingReservationId, setEditingReservationId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ReservationFormData>({
    namaCustomer: "",
    nomorKontak: "",
    tanggalReservasi: "",
    nomorMeja: "",
    durasiJam: 1,
    durasiMenit: 0,
    status: "BOOKED",
    kodeBooking: "",
  });
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [addForm, setAddForm] = useState<ReservationFormData>({
    namaCustomer: "",
    nomorKontak: "",
    tanggalReservasi: "",
    nomorMeja: "",
    durasiJam: 1,
    durasiMenit: 10,
    status: "BOOKED",
  });
  const [deleteModal, setDeleteModal] = useState<{
    visible: boolean;
    reservationId: number | null;
  }>({ visible: false, reservationId: null });

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const fetchReservasis = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reservasi");
      if (!res.ok) throw new Error("Gagal mengambil data");
      const data: Reservasi[] = await res.json();
      const sortedData = data.sort(
        (a, b) => new Date(a.tanggalReservasi).getTime() - new Date(b.tanggalReservasi).getTime()
      );
      setReservasis(sortedData);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Gagal mengambil data reservasi");
      toast.error("Gagal memuat data reservasi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservasis();
    const socket = io("http://localhost:3000", { path: "/api/socket" });
  
    socket.on("reservationAdded", (newReservasi) => {
      setReservasis((prev) => [...prev, newReservasi].sort((a, b) => new Date(a.tanggalReservasi).getTime() - new Date(b.tanggalReservasi).getTime()));
    });
  
    socket.on("reservationDeleted", ({ reservasiId }) => {
      setReservasis((prev) => prev.filter((r) => r.id !== reservasiId));
    });
  
    socket.on("reservationUpdated", (updatedReservasi) => {
      setReservasis((prev) =>
        prev.map((r) => (r.id === updatedReservasi.id ? updatedReservasi : r)).sort((a, b) => new Date(a.tanggalReservasi).getTime() - new Date(b.tanggalReservasi).getTime())
      );
    });
  
    const intervalId = setInterval(fetchReservasis, 10000);
    return () => {
      clearInterval(intervalId);
      socket.disconnect();
    };
  }, []);

  const showDeleteModal = (id: number) => {
    setDeleteModal({ visible: true, reservationId: id });
  };

  const confirmDelete = async () => {
    if (!deleteModal.reservationId) return;
    try {
      const res = await fetch(`/api/reservasi/${deleteModal.reservationId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setReservasis((prev) => prev.filter((r) => r.id !== deleteModal.reservationId));
        toast.success("Reservasi dan pesanan terkait berhasil dihapus");
      } else {
        toast.error("Gagal menghapus reservasi");
      }
    } catch (error) {
      console.error(error);
      toast.error("Terjadi kesalahan saat menghapus");
    }
    setDeleteModal({ visible: false, reservationId: null });
  };

  const cancelDelete = () => setDeleteModal({ visible: false, reservationId: null });

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: name === "durasiJam" || name === "durasiMenit" ? Number(value) : value,
    }));
  };

  const startEditing = (reservation: Reservasi) => {
    setEditingReservationId(reservation.id);
    setEditForm({
      namaCustomer: reservation.namaCustomer,
      nomorKontak: reservation.nomorKontak,
      tanggalReservasi: moment.tz(reservation.tanggalReservasi, "Asia/Jakarta").format("YYYY-MM-DDTHH:mm"),
      nomorMeja: reservation.nomorMeja,
      durasiJam: Math.floor(reservation.durasiPemesanan / 60),
      durasiMenit: reservation.durasiPemesanan % 60,
      status: reservation.status,
      kodeBooking: reservation.kodeBooking,
    });
  };

  const cancelEditing = () => setEditingReservationId(null);

  const isValidReservationTime = (dateString: string) => {
    const now = new Date();
    const selected = new Date(dateString);
    if (selected < now) return false;
    const hour = selected.getHours();
    return hour >= 10 && hour < 22;
  };

  const handleSaveEdit = async (id: number) => {
    const conflict = reservasis.find((r) => {
      if (r.id === id) return false;
      const rDateTime = moment.tz(r.tanggalReservasi, "Asia/Jakarta").format("YYYY-MM-DDTHH:mm");
      return r.nomorMeja === editForm.nomorMeja && rDateTime === editForm.tanggalReservasi;
    });
    if (conflict) {
      toast.error("Meja sudah direservasi pada waktu tersebut");
      return;
    }
  
    if (!isValidReservationTime(editForm.tanggalReservasi)) {
      toast.error("Waktu harus antara 10:00 - 22:00 dan tidak di masa lalu");
      return;
    }
  
    const totalDurasi = editForm.durasiJam * 60 + editForm.durasiMenit;
    const updatedData = {
      namaCustomer: editForm.namaCustomer,
      nomorKontak: editForm.nomorKontak,
      tanggalReservasi: new Date(editForm.tanggalReservasi).toISOString(),
      durasiPemesanan: totalDurasi,
      nomorMeja: editForm.nomorMeja,
      kodeBooking: editForm.kodeBooking,
      status: editForm.status,
    };
  
    try {
      const res = await fetch(`/api/reservasi/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
      if (!res.ok) throw new Error("Gagal mengupdate");
      const updatedReservation: Reservasi = await res.json();
      setReservasis((prev) => prev.map((r) => (r.id === id ? updatedReservation : r)));
      setEditingReservationId(null);
      toast.success("Reservasi berhasil diupdate");
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengupdate reservasi");
    }
  };

  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAddForm((prev) => ({
      ...prev,
      [name]: name === "durasiJam" || name === "durasiMenit" ? Number(value) : value,
    }));
  };

  const cancelAdding = () => setIsAdding(false);

  const handleSaveAdd = async () => {
    const conflict = reservasis.find((r) => {
      const rDateTime = moment.tz(r.tanggalReservasi, "Asia/Jakarta").format("YYYY-MM-DDTHH:mm");
      return r.nomorMeja === addForm.nomorMeja && rDateTime === addForm.tanggalReservasi;
    });
    if (conflict) {
      toast.error("Meja sudah direservasi pada waktu tersebut");
      return;
    }

    if (!isValidReservationTime(addForm.tanggalReservasi)) {
      toast.error("Waktu harus antara 10:00 - 22:00 dan tidak di masa lalu");
      return;
    }

    const now = new Date(addForm.tanggalReservasi);
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear());
    const newKodeBooking = `RESV-${day}${month}${year}-${addForm.namaCustomer.slice(0, 3).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const totalDurasi = addForm.durasiJam * 60 + addForm.durasiMenit;

    const newReservation = {
      namaCustomer: addForm.namaCustomer,
      nomorKontak: addForm.nomorKontak,
      tanggalReservasi: new Date(addForm.tanggalReservasi).toISOString(),
      durasiPemesanan: totalDurasi,
      nomorMeja: addForm.nomorMeja,
      kodeBooking: newKodeBooking,
      status: "BOOKED",
    };

    try {
      const res = await fetch("/api/reservasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReservation),
      });
      if (!res.ok) throw new Error("Gagal menambah");
      const added: Reservasi = await res.json();
      setReservasis((prev) => [...prev, added]);
      setIsAdding(false);
      setAddForm({
        namaCustomer: "",
        nomorKontak: "",
        tanggalReservasi: "",
        nomorMeja: "",
        durasiJam: 1,
        durasiMenit: 10,
        status: "BOOKED",
      });
      toast.success("Reservasi berhasil ditambahkan");
    } catch (error) {
      console.error(error);
      toast.error("Gagal menambah reservasi");
    }
  };

  const statusOptions = ["BOOKED", "RESERVED", "OCCUPIED", "COMPLETED", "CANCELED"];

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-[#FFFAF0] to-[#FFE4C4]">
      <ToastContainer position="top-center" autoClose={3000} />
      <div className={`h-full fixed transition-all duration-300 ${isSidebarOpen ? "w-64" : "w-20"}`}>
        <SidebarCashier isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      </div>
      <div className={`flex-1 p-6 transition-all duration-300 ${isSidebarOpen ? "ml-64" : "ml-20"}`}>
        <h1 className="text-3xl font-bold text-center mb-6 text-[#0E0E0E]">📅 Manajemen Reservasi</h1>

        {loading && <div className="text-center">Memuat data reservasi...</div>}
        {error && <div className="text-center text-red-500">{error}</div>}

        {(editingReservationId || isAdding) && (
          <div className="mb-6 p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-[#92700C]">
              {editingReservationId ? "Edit Reservasi" : "Tambah Reservasi Baru"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#979797]">Nama Customer</label>
                <input
                  type="text"
                  name="namaCustomer"
                  value={editingReservationId ? editForm.namaCustomer : addForm.namaCustomer}
                  onChange={editingReservationId ? handleEditChange : handleAddChange}
                  className="w-full p-2 border border-[#92700C] rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#979797]">Nomor Kontak</label>
                <input
                  type="text"
                  name="nomorKontak"
                  value={editingReservationId ? editForm.nomorKontak : addForm.nomorKontak}
                  onChange={editingReservationId ? handleEditChange : handleAddChange}
                  className="w-full p-2 border border-[#92700C] rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#979797]">Tanggal Reservasi</label>
                <input
                  type="datetime-local"
                  name="tanggalReservasi"
                  value={editingReservationId ? editForm.tanggalReservasi : addForm.tanggalReservasi}
                  onChange={editingReservationId ? handleEditChange : handleAddChange}
                  className="w-full p-2 border border-[#92700C] rounded-md"
                  min={getMinDateTime()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#979797]">Nomor Meja</label>
                <input
                  type="text"
                  name="nomorMeja"
                  value={editingReservationId ? editForm.nomorMeja : addForm.nomorMeja}
                  onChange={editingReservationId ? handleEditChange : handleAddChange}
                  className="w-full p-2 border border-[#92700C] rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#979797]">Durasi</label>
                <div className="flex gap-2">
                  <select
                    name="durasiJam"
                    value={editingReservationId ? editForm.durasiJam : addForm.durasiJam}
                    onChange={editingReservationId ? handleEditChange : handleAddChange}
                    className="w-full p-2 border border-[#92700C] rounded-md"
                  >
                    {[1, 2].map((h) => (
                      <option key={h} value={h}>
                        {h} Jam
                      </option>
                    ))}
                  </select>
                  <select
                    name="durasiMenit"
                    value={editingReservationId ? editForm.durasiMenit : addForm.durasiMenit}
                    onChange={editingReservationId ? handleEditChange : handleAddChange}
                    className="w-full p-2 border border-[#92700C] rounded-md"
                    disabled={editingReservationId ? editForm.durasiJam === 2 : addForm.durasiJam === 2}
                  >
                    {(editingReservationId ? editForm.durasiJam === 1 : addForm.durasiJam === 1)
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
                </div>
              </div>
              {editingReservationId && (
                <div>
                  <label className="block text-sm font-medium text-[#979797]">Status</label>
                  <select
                    name="status"
                    value={editForm.status}
                    onChange={handleEditChange}
                    className="w-full p-2 border border-[#92700C] rounded-md"
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                className="px-4 py-2 bg-[#FF8A00] hover:bg-[#92700C] text-white rounded-md"
                onClick={editingReservationId ? () => handleSaveEdit(editingReservationId) : handleSaveAdd}
              >
                Simpan
              </button>
              <button
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md"
                onClick={editingReservationId ? cancelEditing : cancelAdding}
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {!loading && !error && reservasis.length === 0 && (
          <div className="text-center text-gray-500">Belum ada reservasi</div>
        )}
        {!loading && !error && reservasis.length > 0 && (
          <div className="space-y-4">
            {reservasis.map((reservasi) => (
              <div key={reservasi.id} className="bg-white shadow-md rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-[#979797]">Nama Customer</p>
                    <p className="font-semibold text-[#0E0E0E]">{reservasi.namaCustomer}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#979797]">Tanggal Reservasi</p>
                    <p className="font-semibold text-[#0E0E0E]">
                      {moment.tz(reservasi.tanggalReservasi, "Asia/Jakarta").format("DD/MM/YYYY HH:mm")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#979797]">Status</p>
                    <span
                      className={`px-2 py-1 rounded-full text-sm ${
                        reservasi.status === "BOOKED"
                          ? "bg-blue-100 text-blue-800"
                          : reservasi.status === "RESERVED"
                          ? "bg-yellow-100 text-yellow-800"
                          : reservasi.status === "OCCUPIED"
                          ? "bg-orange-100 text-orange-800"
                          : reservasi.status === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {reservasi.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
                      onClick={() => startEditing(reservasi)}
                    >
                      Edit
                    </button>
                    <button
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                      onClick={() => showDeleteModal(reservasi.id)}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-[#979797]">Nomor Meja</p>
                    <p className="font-semibold">{reservasi.nomorMeja}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#979797]">Durasi</p>
                    <p className="font-semibold">
                      {Math.floor(reservasi.durasiPemesanan / 60)} Jam {reservasi.durasiPemesanan % 60} Menit
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#979797]">Kode Booking</p>
                    <p className="font-semibold">{reservasi.kodeBooking}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isAdding && !editingReservationId && (
          <div className="mt-6 text-center">
            <button
              className="bg-[#FF8A00] hover:bg-[#92700C] text-white px-6 py-3 rounded-lg shadow-md"
              onClick={() => setIsAdding(true)}
            >
              + Tambah Reservasi Baru
            </button>
          </div>
        )}

        {deleteModal.visible && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded shadow-md">
              <p className="mb-4">Apakah anda yakin ingin menghapus reservasi ini?</p>
              <div className="flex justify-end gap-4">
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  onClick={confirmDelete}
                >
                  Ya
                </button>
                <button
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  onClick={cancelDelete}
                >
                  Tidak
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReservasiSidebar;