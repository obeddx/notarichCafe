"use client";

import { useState, useEffect, FormEvent } from "react";
import Sidebar from "@/components/sidebar";

// Tipe data untuk Role dan Employee
interface RoleEmployee {
  id: number;
  name: string;
  employees: {
    id: number;
    employerName: string; // Pastikan schema Employee memiliki field 'employerName'
  }[];
}

export default function EmployeeAccess() {
  const [roles, setRoles] = useState<RoleEmployee[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Kontrol form side panel untuk pembuatan role baru
  const [showForm, setShowForm] = useState(false);
  const [roleName, setRoleName] = useState("");

  // Ambil data roles di awal
  useEffect(() => {
    fetchRoles();
  }, []);

  // Fungsi mengambil data roles dari endpoint /api/employeeRoles
  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/employeeRoles");
      const data = await res.json();
      setRoles(data);
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  // Buka side panel form untuk membuat role baru
  const openCreateForm = () => {
    setRoleName("");
    setShowForm(true);
  };

  // Submit form (hanya untuk menambah role baru)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/employeeRoles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roleName }),
      });
      if (res.ok) {
        await fetchRoles();
        setShowForm(false);
      } else {
        console.error("Error creating role");
      }
    } catch (error) {
      console.error("Error creating role:", error);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#FFFAF0] text-black">
      {/* Sidebar */}
      <Sidebar onToggle={setSidebarOpen} isOpen={sidebarOpen} />

      {/* Konten utama */}
      <div className={`flex-1 p-4 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Employee Access</h1>
          {/* Tombol untuk membuka form pembuatan role baru */}
          <button onClick={openCreateForm} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md">
            Create Employee Role
          </button>
        </div>

        {/* Tabel yang hanya menampilkan Role Name, Employees Assigned, dan Access */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Role Name</th>
                <th className="border p-2">Employees Assigned</th>
                <th className="border p-2">Access</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td className="border p-2">{role.name}</td>

                  {/* Kolom Employees Assigned dengan tooltip di samping */}
                  <td className="border p-2 relative group cursor-pointer overflow-visible">
                    <div className="inline-flex items-center">
                      {role.employees?.length} {role.employees?.length === 1 ? "Employee" : "Employees"}
                      {/* Ikon panah kecil ▼ (opsional) */}
                      <span className="ml-1 text-blue-500 text-sm">&#9662;</span>
                    </div>

                    {/* Tooltip dropdown muncul saat hover, posisinya di samping */}
                    {role.employees && role.employees.length > 0 && (
                      <div
                        className="
                          hidden group-hover:block
                          absolute top-0 left-full
                          ml-2
                          w-52
                          bg-white
                          text-black
                          p-3
                          shadow-lg
                          rounded-md
                          border border-gray-200
                          z-50
                        "
                      >
                        <p className="font-semibold text-gray-700 mb-2">Employee List:</p>
                        <ul className="space-y-1">
                          {role.employees.map((emp) => (
                            <li key={emp.id} className="text-gray-600 text-sm">
                              • {emp.employerName}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </td>

                  <td className="border p-2">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded">App Slots</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Panel Form (untuk membuat role baru) */}
      {showForm && (
        <div className="fixed top-0 right-0 w-full md:w-1/4 h-screen bg-white shadow-xl p-4 z-50">
          <h2 className="text-xl font-bold mb-4">Create Employee Role</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1">Role Name</label>
              <input type="text" value={roleName} onChange={(e) => setRoleName(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" required />
            </div>

            <div className="flex justify-end space-x-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-md border">
                Cancel
              </button>
              <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
