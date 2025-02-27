"use client"; // Jika di App Router

import { useEffect, useState, FormEvent } from "react";
import Sidebar from "@/components/sidebar";

interface Employee {
  id: number;
  employerName: string;
  role: { name: string };
  expiredDate: string;
  employeeStatus: string;
}

export default function EmployeeSlots() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Mengontrol tampilan form (side panel)
  const [showForm, setShowForm] = useState(false);

  // State untuk membedakan ADD vs EDIT
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Field isian form
  const [employerName, setEmployerName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [expiredDate, setExpiredDate] = useState("");
  const [employeeStatus, setEmployeeStatus] = useState("");

  // Ambil data employees di awal
  useEffect(() => {
    fetchData();
  }, []);

  // Fungsi ambil data employees
  const fetchData = async () => {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      setEmployees(data);
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  // Membuka form side panel: untuk Add atau Edit
  const handleOpenForm = (employee?: Employee) => {
    if (employee) {
      // Edit mode
      setEditingEmployee(employee);
      setEmployerName(employee.employerName);
      // role di DB, e.g. employee.role?.id => butuh query lanjutan atau data role
      // untuk contoh, asumsikan roleId = 1 (kasir) / 2 (manager).
      // Anda mungkin perlu simpan role.id di data fetch agar bisa diisi di form.
      setRoleId(""); // Sementara dikosongkan atau isi manual jika data ada
      setExpiredDate(employee.expiredDate.slice(0, 10)); // format "YYYY-MM-DD"
      setEmployeeStatus(employee.employeeStatus);
    } else {
      // Add mode
      setEditingEmployee(null);
      setEmployerName("");
      setRoleId("");
      setExpiredDate("");
      setEmployeeStatus("");
    }
    setShowForm(true);
  };

  // Submit form: jika editingEmployee != null => PUT, else => POST
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (editingEmployee) {
      // EDIT (PUT)
      try {
        const res = await fetch("/api/employees", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingEmployee.id,
            employerName,
            roleId,
            expiredDate,
            employeeStatus,
          }),
        });
        if (res.ok) {
          await fetchData();
          setShowForm(false);
        } else {
          console.error("Error updating employee");
        }
      } catch (error) {
        console.error("Error updating employee:", error);
      }
    } else {
      // ADD (POST)
      try {
        const res = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employerName,
            roleId,
            expiredDate,
            employeeStatus,
          }),
        });
        if (res.ok) {
          await fetchData();
          setShowForm(false);
        } else {
          console.error("Error creating employee");
        }
      } catch (error) {
        console.error("Error creating employee:", error);
      }
    }
  };

  // Hapus data employee
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;
    try {
      const res = await fetch("/api/employees", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        await fetchData();
      } else {
        console.error("Error deleting employee");
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#FFFAF0] text-black">
      {/* Sidebar */}
      <Sidebar onToggle={setSidebarOpen} isOpen={sidebarOpen} />

      <div className={`flex-1 p-4 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        {/* Container Flex untuk judul dan tombol */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl md:text-4xl font-bold">Employee Slots</h1>
          <button
            onClick={() => handleOpenForm()} // Tanpa argumen => Add
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            Add Employee Slot
          </button>
        </div>

        {/* Tabel Data Employee */}
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Employee Name</th>
                <th className="border p-2">Role</th>
                <th className="border p-2">Expiration Date</th>
                <th className="border p-2">Employee Status</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border">
                  <td className="border p-2">{emp.employerName}</td>
                  <td className="border p-2">{emp.role?.name || "-"}</td>
                  <td className="border p-2">{new Date(emp.expiredDate).toLocaleDateString()}</td>
                  <td className="border p-2">{emp.employeeStatus}</td>
                  <td className="border p-2">
                    <button
                      onClick={() => handleOpenForm(emp)} // Edit
                      className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-md mr-2"
                    >
                      Edit
                    </button>
                    <button onClick={() => handleDelete(emp.id)} className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-md">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form (Side Panel) */}
      {showForm && (
        <div className="fixed top-0 right-0 w-full md:w-1/4 h-screen bg-white shadow-xl p-4 z-50">
          <h2 className="text-xl font-bold mb-4">{editingEmployee ? "Edit Employee" : "Add Employee"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1">Employer Name</label>
              <input type="text" value={employerName} onChange={(e) => setEmployerName(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" required />
            </div>

            <div>
              <label className="block mb-1">Role ID</label>
              <input type="number" value={roleId} onChange={(e) => setRoleId(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" required />
              {/*
                Jika Anda punya tabel RoleEmployee (id, name), 
                Anda bisa fetch & tampilkan di dropdown.
                Lalu set value roleId sesuai yang dipilih.
              */}
            </div>

            <div>
              <label className="block mb-1">Expired Date</label>
              <input type="date" value={expiredDate} onChange={(e) => setExpiredDate(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" required />
            </div>

            <div>
              <label className="block mb-1">Employee Status</label>
              <input type="text" value={employeeStatus} onChange={(e) => setEmployeeStatus(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" required />
            </div>

            <div className="flex justify-end space-x-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-md border">
                Cancel
              </button>
              <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md">
                {editingEmployee ? "Update" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
