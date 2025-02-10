import Image from "next/image";
import Link from "next/link";
import React from "react";

const Footer = () => {
  return (
    <div className="w-full bg-gradient-to-t from-black via-gray-800 to-black xs:rounded-tl-[40px] lg:rounded-tl-[100px] py-6">
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 px-4 lg:px-20">
        <div className="flex flex-col items-center">
          <div className="mb-2 h-20 w-20 overflow-hidden rounded-full">
            <Image
              className="bg-white h-32 w-32 -mt-6 object-cover"
              src="/logo-notarich-transparent.png"
              alt="Notarich Logo"
              width={4096}
              height={2304}
            />
          </div>
          <span className="text-white text-xl font-bruno_ace">
            Notarich Cafe
          </span>
        </div>
        <div className="flex flex-col justify-center items-center text-center text-[#FF8A00]">
          <Link href="/" className="mb-3 text-lg">
            About Us
          </Link>
          <Link href="/menu/all" className="mb-3 text-lg">
            Menu
          </Link>
          <Link href="/booking" className="text-lg">
            Booking
          </Link>
        </div>
        <div className="flex flex-col text-white text-sm">
          <div className="flex items-start mb-4">
            <Image
              src="/sun.png"
              alt="Operating Hours"
              width={50}
              height={50}
              className="w-10 h-10"
            />
            <div className="ml-4">
              <p>Monday - Sunday</p>
              <p>10.00 AM - 10.00 PM</p>
            </div>
          </div>
          <div className="flex items-start mb-4">
            <Image
              src="/pin.png"
              alt="Address"
              width={50}
              height={50}
              className="w-10 h-10"
            />
            <div className="ml-4 leading-tight">
              <p>
                Jl. Mejobo Perum Kompleks Nojorono No.2c, Megawonbaru, Mlati
                Norowito, Kec. Kota Kudus, Kabupaten Kudus, Jawa Tengah 59319
              </p>
            </div>
          </div>
          <div className="flex items-start mb-4">
            <Image
              src="/tilpun.png"
              alt="Phone"
              width={50}
              height={50}
              className="w-10 h-10"
            />
            <div className="ml-4">
              <p>088221738878</p>
            </div>
          </div>
          <div className="flex items-start">
            <Image
              src="/ig.png"
              alt="Instagram"
              width={50}
              height={50}
              className="w-10 h-10"
            />
            <div className="ml-4">
              <p>@notarich.co</p>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full text-white text-center text-sm font-light mt-4">
        <p>2024 | Notarich Cafe. All right reserved.</p>
      </div>
    </div>
  );
};

export default Footer;
