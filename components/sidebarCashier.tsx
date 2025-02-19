"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaBars, FaTimes } from "react-icons/fa";

// Definisikan tipe props untuk SidebarCashier
interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const SidebarCashier: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  return (
    <div
      className={`fixed top-0 left-0 h-full bg-[#212121] shadow-lg z-50 transition-all duration-300 ${
        isOpen ? "w-64" : "w-20"
      }`}
    >
      <div className="flex flex-col items-center py-6">
        {/* Tombol Toggle */}
        <button
          onClick={onToggle}
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
            <p className="text-white mt-1 text-sm">Cashier Site</p>
          </div>
        )}
      </div>

      {/* Menu */}
      <ul className="mt-6">
        <SidebarItem href="/cashier/kasir" label="Cashier" isOpen={isOpen} />
        <SidebarItem href="/cashier/layoutCafe" label="Layout Cafe" isOpen={isOpen} border />
        <SidebarItem href="/cashier/history" label="Riwayat" isOpen={isOpen} border />
        <SidebarItem href="/cashier/reservasi" label="reservasi" isOpen={isOpen} border />
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

const SidebarItem: React.FC<SidebarItemProps> = ({ href, label, isOpen, border = false }) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link href={href}>
      <div
        className={`text-white text-md leading-10 mx-4 py-2 px-4 rounded-md transition-all cursor-pointer hover:bg-[#FF8A00] ${
          border ? "border-y-2 border-neutral-700" : ""
        } ${
          isActive ? "bg-[#FF8A00] font-bold" : ""
        }`}
      >
        {isOpen ? label : label.charAt(0)}
      </div>
    </Link>
  );
};

export default SidebarCashier;