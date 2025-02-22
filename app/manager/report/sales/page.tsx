// pages/manager/report/sales/page.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SalesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/manager/report/sales/summary");
  }, [router]);
  return null;
}
