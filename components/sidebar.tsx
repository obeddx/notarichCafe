"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react"; // Tambahkan useEffect
import { FaBars, FaTimes } from "react-icons/fa";

interface SidebarProps {
  onToggle: (open: boolean) => void;
  isOpen: boolean; // Terima state dari parent
}

const Sidebar: React.FC<SidebarProps> = ({ onToggle, isOpen }) => {
  const handleToggle = () => {
    const newOpenState = !isOpen;
    onToggle(newOpenState); // Kirim state terbaru ke parent
  };

  return (
    <div
      className={`fixed top-0 left-0 h-full bg-[#212121] shadow-lg z-50 transition-all duration-300 ${
        isOpen ? "w-64" : "w-20"
      }`}
    >
      <div className="flex flex-col items-center py-6">
        {/* Tombol Toggle */}
        <button
          onClick={handleToggle}
          className="absolute top-4 right-4 text-white text-2xl focus:outline-none"
        >
          {isOpen ? <FaTimes /> : <FaBars />}
        </button>

        {/* Logo */}
        <div className={`my-4 h-32 overflow-hidden rounded-full transition-all ${isOpen ? "w-32" : "w-16"}`}>
          <Image
            className="bg-white object-cover transition-all"
            src="/logo-notarich-transparent.png"
            height={4096}
            width={2304}
            alt="Logo"
          />
        </div>

        {/* Nama & Deskripsi */}
        {isOpen && (
          <div className="text-center">
            <span className="font-bruno_ace text-white text-2xl tracking-tight">Notarich Cafe</span>
            <p className="text-white mt-1 text-sm">Manager Site</p>
          </div>
        )}
      </div>

      {/* Menu */}
      <ul className="mt-6">
        <SidebarItem href="/manager" label="Dashboard" isOpen={isOpen} />
        <SidebarItem href="/manager/getMenu" label="Menu" isOpen={isOpen} />
        <SidebarItem href="/manager/getBahan" label="Bahan" isOpen={isOpen} border />
        <SidebarItem href="/manager/rekapStokCafe" label="Rekap Stok Cafe" isOpen={isOpen} border />
      </ul>
    </div>
  );
};

interface SidebarItemProps {
  href: string;
  label: string;
  isOpen: boolean;
  border?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ href, label, isOpen, border = false }) => (
  <Link href={href}>
    <div
      className={`text-white text-md leading-10 mx-4 py-2 px-4 rounded-md transition-all cursor-pointer hover:bg-[#FF8A00] ${
        border ? "border-y-2 border-neutral-700" : ""
      }`}
    >
      {isOpen ? label : label.charAt(0)}
    </div>
  </Link>
);

export default Sidebar;