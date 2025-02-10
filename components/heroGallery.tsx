"use client"
import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

const images = [
  "/gambar-kiri.jpg",
  "/gambar-tengah.jpg",
  "/gambar-kanan.jpg",
];

export default function GallerySlide() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  return (
    <section className="relative w-full bg-gray-100 py-12">
      <h2 className="text-4xl font-bold text-center mb-8 text-gray-800">
        Our Cafe Gallery
      </h2>
      <div className="relative w-full max-w-4xl mx-auto">
        <div className="flex justify-center items-center">
          {/* Tombol Kiri */}
          <button
            onClick={handlePrev}
            className="absolute left-0 text-gray-700 p-3 hover:text-gray-900"
          >
            <ChevronLeft size={32} />
          </button>

          {/* Gambar Slide */}
          <div className="flex justify-center w-full">
            <Image
              src={images[currentIndex]}
              alt={`Cafe Image ${currentIndex + 1}`}
              width={600}
              height={400}
              className="rounded-2xl object-cover"
            />
          </div>

          {/* Tombol Kanan */}
          <button
            onClick={handleNext}
            className="absolute right-0 text-gray-700 p-3 hover:text-gray-900"
          >
            <ChevronRight size={32} />
          </button>
        </div>
      </div>
    </section>
  );
}
