"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface Role {
  id: number;
  name: string;
}

const getImageForRole = (roleName: string): string => {
  switch (roleName.toLowerCase()) {
    case "manager":
      return "/admin-icon.jpg";
    case "kasir":
      return "/kasir-icon.jpg";
    // Tambahkan case lain jika ada role baru
    default:
      return "/default-role-icon.jpg"; // Gambar default jika role tidak dikenali
  }
};

const PortalPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch("/api/employeeRoles");
        if (!res.ok) {
          throw new Error("Failed to fetch roles");
        }
        const data = await res.json();
        // Asumsi data yang dikembalikan adalah array role
        setRoles(data);
      } catch (err: any) {
        console.error(err);
        setError("Failed to load roles.");
      } finally {
        setLoading(false);
      }
    };
    fetchRoles();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-cover bg-center relative" style={{ backgroundImage: "url('/login2.png')" }}>
      {/* Overlay untuk efek gelap */}
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>

      {/* Konten utama */}
      <div className="relative z-10 flex flex-col items-center text-white">
        <div className="flex items-center mb-8">
          <Image src="/logo-notarich.png" alt="Notarich Logo" width={50} height={50} className="rounded-full" />
          <h1 className="text-3xl ml-2">Notarich Cafe</h1>
        </div>

        {loading && <p>Loading roles...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {/* Render card role secara dinamis */}
        <div className="flex flex-wrap justify-center gap-6">
          {roles.map((role) => (
            <div key={role.id} className="flex flex-col items-center bg-white bg-opacity-20 p-4 rounded-2xl shadow-lg backdrop-blur-md">
              <Image src={getImageForRole(role.name)} alt={`${role.name} Icon`} width={400} height={400} className="rounded-full" />
              <Link href={`/login?role=${role.name.toLowerCase()}`}>
                <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition">{role.name}</button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PortalPage;
