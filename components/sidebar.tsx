"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FaBars, FaTimes, FaChevronDown, FaChevronUp } from "react-icons/fa";
import LogoutButton from "@/components/LogoutButton";

interface SidebarProps {
  onToggle: (open: boolean) => void;
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ onToggle, isOpen }) => {
  const handleToggle = () => {
    onToggle(!isOpen);
  };

  return (
    <div className={`fixed top-0 left-0 h-full bg-[#212121] shadow-lg z-50 transition-all duration-300 overflow-y-auto ${isOpen ? "w-64" : "w-20"}`}>
      <div className="flex flex-col items-center py-6 relative">
        <button onClick={handleToggle} className="absolute top-4 right-4 text-white text-2xl focus:outline-none">
          {isOpen ? <FaTimes /> : <FaBars />}
        </button>
        <div className={`my-4 h-32 overflow-hidden rounded-full transition-all ${isOpen ? "w-32" : "w-16"}`}>
          <Image src="/logo-notarich-transparent.png" alt="Logo" width={2304} height={4096} className="bg-white object-cover transition-all" />
        </div>
        {isOpen && (
          <div className="text-center">
            <span className="font-bruno_ace text-white text-2xl tracking-tight">Notarich Cafe</span>
            <p className="text-white mt-1 text-sm">Manager Site</p>
          </div>
        )}
      </div>
      <ul className="mt-6 space-y-2">
        <li>
          <SidebarItem href="/manager" label="Dashboard" isOpen={isOpen} />
        </li>
        <li>
          <SidebarDropdown
            label="Reports"
            isOpen={isOpen}
            items={[
              { href: "/manager/report/sales", label: "Sales" },
              { href: "/manager/report/transactions", label: "Transactions" },
            ]}
            border
          />
        </li>
        <li>
          <SidebarDropdown label="Menu Notarich" isOpen={isOpen} items={[{ href: "/manager/getMenu", label: "Daftar Menu" }]} border />
        </li>
        <li>
          <SidebarDropdown
            label="Library"
            isOpen={isOpen}
            items={[
              { href: "/manager/library/taxes", label: "Taxes" },
              { href: "/manager/library/gratuity", label: "Gratuity" },
              { href: "/manager/library/diskon", label: "Discount" },
            ]}
            border
          />
        </li>
          {/* Tambahan Label Modifier */}
          <li>
          <SidebarDropdown
            label="Modifier"
            isOpen={isOpen}
            items={[
              { href: "/manager/modifier", label: "Modifier" },
              { href: "/manager/modifierCategory", label: "Category" },
            ]}
            border
          />
        </li>
        <li>
          <SidebarDropdown
            label="Ingredients"
            isOpen={isOpen}
            items={[
              { href: "/manager/getBahan", label: "Ingredients Library" },
              { href: "/manager/ingridientCategory", label: "Ingredient Category" },
              { href: "/manager/Ingredient/recipes", label: "Recipes" },
            ]}
            border
          />
        </li>
        <li>
          <SidebarDropdown
            label="Inventory"
            isOpen={isOpen}
            items={[
              { href: "/manager/getGudang", label: "Summary" },
              { href: "/manager/inventory/suppliers", label: "Supplier" },
              { href: "/manager/inventory/purchaseOrder", label: "Purchase Order (PO)" },
            ]}
            border
          />
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
    
        {/* Tombol Logout */}
        <li className="mt-4 mx-4">
          <LogoutButton />
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
  isDropdownItem?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ href, label, isOpen, border = false, isDropdownItem = false }) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  let classes = `text-white text-md py-2 px-4 rounded-md transition-all cursor-pointer hover:bg-[#FF8A00] ${isActive ? "bg-[#FF8A00] font-bold" : ""}`;
  if (border) classes += " border-y-2 border-neutral-700";
  if (!isDropdownItem) classes += " mx-4";
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
  const pathname = usePathname();
  const isActive = items.some((item) => item.href === pathname);
  return (
    <div className={`mx-4 ${border ? "border-y-2 border-neutral-700" : ""}`}>
      <div onClick={toggleDropdown} className={`flex justify-between items-center text-white text-md py-2 px-4 rounded-md transition-all cursor-pointer hover:bg-[#FF8A00] ${isActive ? "bg-[#FF8A00] font-bold" : ""}`}>
        <span>{isOpen ? label : label.charAt(0)}</span>
        {isOpen && (dropdownOpen ? <FaChevronUp /> : <FaChevronDown />)}
      </div>
      {dropdownOpen && (
        <div className="ml-4 mt-2 flex flex-col gap-2">
          {items.map((item, index) => (
            <SidebarItem key={index} href={item.href} label={item.label} isOpen={isOpen} isDropdownItem />
          ))}
        </div>
      )}
    </div>
  );
};

export default Sidebar;