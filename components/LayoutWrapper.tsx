"use client"; // Wajib agar bisa pakai usePathname()

import { usePathname } from "next/navigation";
import Sidebar from "@/components/sidebar";
import NavbarGlass from "@/components/navbar";
import Footer from "@/components/Footer";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isManagerPage = pathname?.startsWith("/manager") ?? false;

  return isManagerPage ? (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-4">{children}</main>
    </div>
  ) : (
    <>
      <NavbarGlass />
      {children}
      <Footer />
    </>
  );
}
