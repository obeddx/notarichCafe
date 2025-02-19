"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FaBars, FaTimes, FaChevronDown, FaChevronUp } from "react-icons/fa";

interface SidebarProps {
  onToggle: (open: boolean) => void;
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ onToggle, isOpen }) => {
  const handleToggle = () => {
    const newOpenState = !isOpen;
    onToggle(newOpenState);
  };

  return (
    <div className={`fixed top-0 left-0 h-full max-h-screen bg-[#212121] shadow-lg z-50 transition-all duration-300 overflow-y-auto pr-2 ${isOpen ? "w-64" : "w-20"}`}>
      <div className="flex flex-col items-center py-6">
        {/* Tombol Toggle */}
        <button onClick={handleToggle} className="absolute top-4 right-4 text-white text-2xl focus:outline-none">
          {isOpen ? <FaTimes /> : <FaBars />}
        </button>

        {/* Logo */}
        <div className={`my-4 h-32 overflow-hidden rounded-full transition-all ${isOpen ? "w-32" : "w-16"}`}>
          <Image className="bg-white object-cover transition-all" src="/logo-notarich-transparent.png" height={4096} width={2304} alt="Logo" />
        </div>

        {/* Nama & Deskripsi */}
        {isOpen && (
          <div className="text-center">
            <span className="font-bruno_ace text-white text-2xl tracking-tight">Notarich Cafe</span>
            <p className="text-white mt-1 text-sm">Manager Site</p>
          </div>
        )}
      </div>

      {/* Menu dengan spacing */}
      <ul className="mt-6 space-y-2">
        <li>
          <SidebarItem href="/manager" label="Dashboard" isOpen={isOpen} />
        </li>
        <li>
          <SidebarDropdown
            label="Menu Notarich"
            isOpen={isOpen}
            items={[
              { href: "/manager/getMenu", label: "Daftar Menu" },
              { href: "/manager/getBundle", label: "Daftar Bundle" },
              
            ]}
           border
          />
        </li>
        <li>
          <SidebarItem href="/manager/getBahan" label="Bahan" isOpen={isOpen} border />
        </li>
        <li>
          <SidebarItem href="/manager/getGudang" label="Gudang" isOpen={isOpen} border />
        </li>
        <li>
          <SidebarDropdown
            label="Rekap Notarich"
            isOpen={isOpen}
            items={[
              { href: "/manager/rekapStokCafe", label: "Rekap Stok Cafe" },
              { href: "/manager/rekapStokGudang", label: "Rekap Stok Gudang" },
              { href: "/manager/rekapPenjualan", label: "Rekap Penjualan" },
            ]}
           border
          />
        </li>
       
        
      </ul>
    </div>
  );
};

interface SidebarItemProps {
  href: string;
  label: string;
  isOpen: boolean;
  border?: boolean;
  isDropdownItem?: boolean; // Menandakan item berada di dalam dropdown
}

const SidebarItem: React.FC<SidebarItemProps> = ({ href, label, isOpen, border = false, isDropdownItem = false }) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  // Kelas dasar
  let classes = `text-white text-md leading-10 py-2 px-4 rounded-md transition-all cursor-pointer hover:bg-[#FF8A00] ${isActive ? "bg-[#FF8A00] font-bold" : ""}`;

  // Jika item punya border (item top-level) tambahkan border-y
  if (border) {
    classes += " border-y-2 border-neutral-700";
  }

  // Jika item BUKAN dropdown, tambahkan margin horizontal
  if (!isDropdownItem) {
    classes += " mx-4";
  }

  return (
    <Link href={href}>
      <div className={classes}>{isOpen ? label : label.charAt(0)}</div>
    </Link>
  );
};

interface SidebarDropdownProps {
  label: string;
  isOpen: boolean;
  items: { href: string; label: string }[];
  border?: boolean;
}

const SidebarDropdown: React.FC<SidebarDropdownProps> = ({ label, isOpen, items, border = false }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  // Cek apakah salah satu item dropdown aktif
  const pathname = usePathname();
  const isActive = items.some((item) => item.href === pathname);

  return (
    <div className={`mx-4 ${border ? "border-y-2 border-neutral-700" : ""}`}>
      {/* Tombol Induk Dropdown */}
      <div onClick={toggleDropdown} className={`flex justify-between items-center text-white text-md leading-10 py-2 px-4 rounded-md transition-all cursor-pointer hover:bg-[#FF8A00] ${isActive ? "bg-[#FF8A00] font-bold" : ""}`}>
        <span>{isOpen ? label : label.charAt(0)}</span>
        {isOpen && (dropdownOpen ? <FaChevronUp /> : <FaChevronDown />)}
      </div>

      {/* Isi Dropdown */}
      {dropdownOpen && (
        <div className="ml-4 mt-2 flex flex-col gap-2">
          {items.map((item, index) => (
            <SidebarItem
              key={index}
              href={item.href}
              label={item.label}
              isOpen={isOpen}
              isDropdownItem // Tandakan item ini berada di dalam dropdown
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
