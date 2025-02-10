import Link from "next/link";
import Image from "next/image";

export default function HeroSection() {
  return (
    <section className="relative bg-cover bg-center h-screen text-white bg-[url('/bg-hero1.png')]">
      <div className="bg-black/60 absolute inset-0"></div>
      <div className="relative z-10 grid grid-cols-2 items-center h-full px-6 text-center">
        {/* Bagian Kiri Hero */}
        <div className="flex flex-col justify-center items-start text-left">
          <h1 className="text-5xl font-bold mb-4">Everyday is a Coffee Day!</h1>
          <p className="text-lg mb-8">
            Boost your productivity and build your mood with a glass of coffee at Notarich.
          </p>
          <div className="flex gap-4">
            <Link href="/menu" className="px-6 py-3 bg-orange-500 rounded-2xl text-white hover:bg-orange-600">
              Booking Table
            </Link>
            <Link href="/reservasi" className="px-6 py-3 bg-green-500 rounded-2xl text-white hover:bg-green-600">
              Order Online
            </Link>
          </div>
        </div>

        {/* Bagian Kanan Hero */}
        <div className="flex flex-col items-center justify-center">
          {/* Gambar */}
          <Image
            src="/coffee.png"
            alt="Coffee Cup"
            width={500}
            height={500}
            className="rounded-full shadow-lg"
          />
          {/* Keterangan Hari dan Jam Operasional */}
          <div className="mt-4 text-center">
            <h2 className="text-xl font-semibold">Operational Hours</h2>
            <p className="text-lg">Monday - Sunday: 10:00 AM - 10:00 PM</p>
          </div>
        </div>
      </div>
    </section>
  );
}
