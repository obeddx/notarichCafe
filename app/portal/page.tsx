import React from "react";
import Image from "next/image";
import Link from "next/link";

const PortalPage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-cover bg-center relative" style={{ backgroundImage: "url('/login2.png')" }}>
      {/* Overlay untuk efek gelap di background */}
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>

      {/* Container konten utama */}
      <div className="relative z-10 flex flex-col items-center text-white">
        {/* Logo dan Judul */}
        <div className="flex items-center mb-8">
          <Image src="/logo-notarich.png" alt="Notarich Logo" width={50} height={50} className="rounded-full" />
          <h1 className="text-3xl ml-2">Notarich Cafe</h1>
        </div>

        {/* Card Login Admin & Kasir */}
        <div className="flex space-x-6 md:space-x-10">
          {/* Card Admin */}
          <div className="flex flex-col items-center bg-white bg-opacity-20 p-4 rounded-2xl shadow-lg backdrop-blur-md">
            <Image src="/admin-icon.jpg" alt="Admin Icon" width={400} height={400} className="rounded-full" />
            <Link href="/login/manager">
              <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition">Manager</button>
            </Link>
          </div>

          {/* Card Kasir */}
          <div className="flex flex-col items-center bg-white bg-opacity-20 p-4 rounded-2xl shadow-lg backdrop-blur-md">
            <Image src="/kasir-icon.jpg" alt="Kasir Icon" width={400} height={400} className="rounded-full" />
            <Link href="/login/kasir">
              <button className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 transition">Kasir</button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortalPage;
