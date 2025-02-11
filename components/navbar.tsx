"use client";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiMenu, FiX } from "react-icons/fi";

const NavbarGlass = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  const scrollToAboutUs = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    event.preventDefault();

    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      router.push("/#about-us");
    } else {
      const aboutUsSection = document.getElementById("about-us");
      if (aboutUsSection) {
        aboutUsSection.scrollIntoView({ behavior: "smooth" });
        closeMenu();
      }
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-20 flex flex-row h-20 items-center px-6 bg-white/70 backdrop-blur-md shadow-md transition-colors duration-300">
      {/* Logo */}
      <div className="w-1/2 flex items-center gap-4">
        <Image
          className="h-14 w-14 object-cover rounded-full"
          src="/logo-notarich-transparent.png"
          width={100}
          height={100}
          alt="Notarich Cafe Logo"
        />
        <span className="font-bruno_ace text-2xl">
          <Link href="/" className="hover:text-orange-600 transition-colors">
            Notarich Cafe
          </Link>
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
            <a href="#about-us" onClick={(e) => scrollToAboutUs(e)} className="hover:text-orange-600 transition-colors">
              About Us
            </a>
          </li>
        </ul>
        <Link href="/reserve">
          <button className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-xl shadow-md">
            Booking
          </button>
        </Link>
      </div>

      {/* Mobile Hamburger Icon */}
      <div className="md:hidden ml-auto">
        <button onClick={toggleMenu}>{menuOpen ? <FiX size={28} /> : <FiMenu size={28} />}</button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="absolute top-20 left-0 w-full bg-white/90 backdrop-blur-md shadow-lg p-4 z-30">
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
              <a href="#about-us" onClick={(e) => scrollToAboutUs(e)}>
                About Us
              </a>
            </li>
          </ul>
          <Link href="/reserve" onClick={closeMenu}>
            <button className="w-full bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 mt-4 rounded-xl shadow-md">
              Booking
            </button>
          </Link>
        </div>
      )}
    </nav>
  );
};

export default NavbarGlass;
