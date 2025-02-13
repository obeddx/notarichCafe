import Image from "next/image";
import Link from "next/link";
import React from "react";

const SidebarCashier = () => {
  return (
    <div className="fixed top-0 left-0 w-64 h-full bg-[#212121] shadow-lg z-10 pt-16 ">
      <div className="flex flex-col items-center justify-center">
        <div className="my-4 h-32 w-32 overflow-hidden rounded-full">
          <Image className="bg-white h-48 w-48 -mt-8 object-cover" src="/logo-notarich-transparent.png" height={4096} width={2304} alt="Logo" />
        </div>
        <div className="mb-8 text-center">
          <span className="font-bruno_ace text-white text-2xl tracking-tight">Notarich Cafe</span>
          <p className="text-white mt-2">Welcome</p>
        </div>
      </div>
      <ul className="flex flex-col">
        <Link href="/cashier" className="text-[#FFFFFF] text-md leading-10 mx-6 py-1 hover:bg-black cursor-pointer">
          Cashier
        </Link>
        <Link href="/cashier/layoutCafe" className="text-[#FFFFFF] text-md leading-10 mx-6 py-1 hover:bg-black cursor-pointer border-y-2 border-neutral-700">
          Layout Cafe
        </Link>
      </ul>
    </div>
  );
};

export default SidebarCashier;
