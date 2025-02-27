// components/SidebarSales.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SidebarSales = () => {
  const pathname = usePathname();
  // Daftar item sidebar khusus untuk halaman Sales
  const salesItems = [
    { href: "/manager/report/sales/summary", label: "Sales Summary" },
    { href: "/manager/report/sales/gross-profit", label: "Gross Profit" },
    { href: "/manager/report/sales/payment-method", label: "Payment Methods" },
    { href: "/manager/report/sales/item-sales", label: "Item Sales" },
    { href: "/manager/report/sales/DiscountReport", label: "Discounts" },
    { href: "/manager/report/sales/TaxReport", label: "Taxes" },
    { href: "/manager/report/sales/GratuityReport", label: "Gratuity" },
    { href: "/manager/report/sales/ModifierSales", label: "Modifier Sales" },
    { href: "/manager/report/sales/category-sales", label: "Category Sales" },
    // Anda bisa menambahkan item lain, misalnya:
    // { href: "/manager/report/sales/item", label: "Item Sales" },
  ];

  return (
    <div className="h-full bg-[#212121] text-white">
      <ul className="space-y-2 p-4">
        {salesItems.map((item, index) => {
          const isActive = pathname === item.href;
          return (
            <li key={index}>
              <Link href={item.href}>
                <div
                  className={`p-2 rounded transition-colors ${
                    isActive ? "bg-[#FF8A00] font-bold" : "hover:bg-[#FF8A00]"
                  }`}
                >
                  {item.label}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default SidebarSales;
