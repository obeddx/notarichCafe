"use client";

import HeroAboutUs from "@/components/heroAboutUs";

export default function AboutPage() {
  return (
    <div className="mt-16 min-h-screen bg-gradient-to-r from-black via-gray-800 to-black flex items-center justify-center">
      <div className="bg-white bg-opacity-80 p-10 rounded-2xl shadow-lg">
        <HeroAboutUs />
      </div>
    </div>
  );
}