"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function HeroSection() {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoaded(true), 100);
        return () => clearTimeout(timer);
    }, []);

    return (   
    <section className="relative bg-cover bg-center min-h-screen text-white bg-[url('/bg-hero1.png')] bg-fixed xs:rounded-bl-[100px] lg:rounded-bl-[200px] flex items-center pt-20 lg:pt-0">
        <div className="bg-black/60 absolute inset-0"></div>
        <div className={`relative z-10 grid grid-cols-1 lg:grid-cols-2 items-center h-full px-6 lg:px-32 text-center lg:text-left w-full transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>       
        {/* Bagian Kiri Hero */}
        <div className={`flex flex-col justify-center items-start mt-10 lg:mt-0 transform transition-transform duration-1000 ${isLoaded ? 'translate-x-0' : '-translate-x-full'}`}>
            <h1 className="xs:text-5xl lg:text-7xl font-semibold mb-4">Everyday is a Coffee Day!</h1>
            <p className="xs:text-lg lg:text-2xl font-light mb-6 lg:pr-96">
                Boost your productivity and build your mood with a glass of coffee at Notarich.
            </p>
        <div className="flex xs:flex-col lg:flex-row gap-4 xs:mt-2 lg:mt-6">
            <Link href="/reservasi">
                <button className="flex items-center text-white xs:text-base lg:text-xl font-light bg-[#FF8A00] border-2 border-[#FF8A00] rounded-2xl py-2 px-6 lg:px-8 w-fit transform transition-transform duration-300 hover:scale-105">
                    <Image src="/table.png" alt="" height={22} width={22} className="mr-2" />
                    Booking Table
                </button>
            </Link>
            <Link href="/menu">
                <button className="flex items-center text-white xs:text-base lg:text-xl font-light bg-[#FF8A00] bg-opacity-50 border-2 border-[#FF8A00] rounded-2xl py-2 px-6 lg:px-8 w-fit transform transition-transform duration-300 hover:scale-105">
                    <Image src="/bottle.png" alt="" width={12} height={12} className="mr-2" />
                    Order Online
                </button>
            </Link>
        </div>
        </div>
        {/* Bagian Kanan Hero */}
        <div className={`flex flex-col items-center justify-center mt-6 lg:mt-10 transform transition-transform duration-1000 ${isLoaded ? 'translate-x-0' : 'translate-x-full'}`}>  
          {/* Gambar */}
          <div className="border-b-2 border-[#FF8A00]">
              <Image src="/coffee.png" alt="Coffee Cup" width={400} height={400} className="w-[400px] h-[400px] transform transition-transform duration-300 hover:scale-105" />
          </div>
          {/* Keterangan Hari dan Jam Operasional */}
          <div className="text-white text-lg lg:text-2xl mt-2 text-center">
              <p>Open Hours</p>
              <p>Monday - Sunday: 10:00 AM - 10:00 PM</p>
          </div>
        </div>
    </div>
    </section>
    );
}
