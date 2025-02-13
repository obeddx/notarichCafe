"use client"; // Wajib agar bisa pakai usePathname()

import { usePathname } from "next/navigation";
import Sidebar from "@/components/sidebar";
import NavbarGlass from "@/components/navbar";
import Footer from "@/components/Footer";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isManagerPage = pathname?.startsWith("/manager") ?? false;
  const isCashierLayoutCafe = pathname === "/cashier/layoutCafe"; // Cek apakah di halaman Layout Cafe

  return isManagerPage ? (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-4">{children}</main>
    </div>
  ) : (
    <>
      {!isCashierLayoutCafe && <NavbarGlass />} {/* Hilangkan Navbar di /cashier/layoutCafe */}
      {children}
      {!isCashierLayoutCafe && <Footer />} {/* Hilangkan Footer di /cashier/layoutCafe */}
    </>
  );
}
