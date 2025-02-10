'use client'
import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiMenu, FiX } from 'react-icons/fi';

const NavbarGlass = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="flex flex-row z-10 w-full h-32 items-center p-6 sticky top-0 bg-white/70 backdrop-blur-md shadow-md transition-colors duration-300">
      <div className="w-1/2 flex items-center gap-4">
        <Image
          className="h-20 w-20 object-cover rounded-full"
          src="/logo-notarich-transparent.png"
          width={4096}
          height={2304}
          alt="Notarich Cafe Logo"
        />
        <span className="font-bruno_ace lg:text-3xl lg:tracking-tight">
          Notarich Cafe
        </span>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:flex w-1/2 justify-end items-center gap-6">
        <ul className="flex space-x-8 text-lg font-semibold">
          <li>
            <Link href="/" className="hover:text-orange-600 transition-colors">
              Home
            </Link>
          </li>
          <li>
            <Link href="/menu" className="hover:text-orange-600 transition-colors">
              Menu
            </Link>
          </li>
          <li>
            <Link href="/contact" className="hover:text-orange-600 transition-colors">
              About Us
            </Link>
          </li>
        </ul>

        <Link href="/reserve">
          <button className="btn bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-xl shadow-md">
            Booking
          </button>
        </Link>
      </div>

      {/* Mobile Hamburger Icon */}
      <div className="md:hidden ml-auto">
        <button onClick={toggleMenu}>
          {menuOpen ? <FiX size={28} /> : <FiMenu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="absolute top-24 left-0 w-full bg-white/90 backdrop-blur-md shadow-lg p-4 z-20">
          <ul className="flex flex-col space-y-4 text-lg font-semibold">
            <li>
              <Link href="/" onClick={closeMenu}>
                Home
              </Link>
            </li>
            <li>
              <Link href="/menu" onClick={closeMenu}>
                Menu
              </Link>
            </li>
            <li>
              <Link href="/contact" onClick={closeMenu}>
                About Us
              </Link>
            </li>
          </ul>
          <Link href="/reserve" onClick={closeMenu}>
            <button className="btn w-full bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 mt-4 rounded-xl shadow-md">
              Booking
            </button>
          </Link>
        </div>
      )}
    </nav>
  );
};

export default NavbarGlass;
