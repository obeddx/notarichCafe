"use client"; // Wajib agar bisa pakai usePathname()

import { usePathname } from "next/navigation";
import Sidebar from "@/components/sidebar";
import NavbarGlass from "@/components/navbar";
import Footer from "@/components/Footer";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isManagerPage = pathname?.startsWith("/manager") ?? false;
  const isCashierHiddenPage = pathname === "/cashier/layoutCafe" || pathname === "/cashier/history" || pathname === "/cashier/kasir"|| pathname === "/cashier/menus" || pathname === "/reservasi/layoutCafe" 
  || pathname === "/cashier/reservasi"  || pathname === "/portal"  || pathname === "/login" || pathname === "/register" || pathname === "/cashier/visitor"; // Cek apakah di halaman yang perlu menghilangkan Navbar dan Footer

  return isManagerPage ? (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-4">{children}</main>
    </div>
  ) : (
    <>
      {!isCashierHiddenPage && <NavbarGlass />} {/* Hilangkan Navbar di halaman tertentu */}
      {children}
      {!isCashierHiddenPage && <Footer />} {/* Hilangkan Footer di halaman tertentu */}
    </>
  );
}
