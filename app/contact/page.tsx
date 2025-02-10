"use client";
import Image from "next/image";
import { Mail, Phone, MapPin, CheckCircle } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-300 to-orange-500 py-16 px-6 flex items-center justify-center mt-16">
      {/* Container utama dengan efek kaca buram */}
      <div className="max-w-6xl w-full bg-white/90 backdrop-blur-md shadow-xl rounded-lg p-10 border border-gray-200">
        {/* Header */}
        <h1 className="text-5xl font-extrabold text-center text-orange-700 mb-8">
          Profil Perusahaan
        </h1>

        {/* Sejarah Perusahaan */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-5">Sejarah Kami</h2>
          <p className="text-gray-700 leading-relaxed">
            Berdiri sejak tahun 2005, perusahaan kami terus berkembang untuk menghadirkan solusi teknologi inovatif.
            Berawal dari startup kecil, kini kami telah menjangkau pasar global dengan berbagai produk unggulan.
          </p>
          <p className="text-gray-700 mt-4 leading-relaxed">
            Dengan fokus pada riset dan pengembangan, kami telah membantu ribuan bisnis mencapai efisiensi dan
            kesuksesan di era digital.
          </p>
        </section>

        {/* Gambar Kantor */}
        <div className="mb-12">
          <Image
            src="/office.jpg"
            alt="Foto Kantor"
            width={1280}
            height={720}
            className="rounded-lg shadow-lg w-full object-cover"
          />
        </div>

        {/* Visi & Misi */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-5">Visi & Misi</h2>
          <div className="bg-orange-100 p-6 rounded-lg shadow-md">
            <h3 className="text-2xl font-semibold text-orange-700">Visi</h3>
            <p className="text-gray-800 text-lg mt-2">
              Menjadi perusahaan teknologi terdepan yang menciptakan solusi inovatif untuk dunia.
            </p>
            <h3 className="text-2xl font-semibold text-orange-700 mt-6">Misi</h3>
            <ul className="list-disc list-inside text-gray-800 text-lg mt-2 space-y-2">
              <li>Mengembangkan produk berkualitas tinggi yang mendukung pertumbuhan bisnis.</li>
              <li>Mengutamakan kepuasan pelanggan dengan layanan terbaik.</li>
              <li>Mendorong inovasi dan penggunaan teknologi terkini.</li>
              <li>Berkomitmen terhadap tanggung jawab sosial perusahaan.</li>
            </ul>
          </div>
        </section>

        {/* Keunggulan Perusahaan */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-5">Keunggulan Kami</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { text: "Teknologi Inovatif", icon: <CheckCircle className="text-green-600 w-8 h-8" /> },
              { text: "Tim Profesional", icon: <CheckCircle className="text-green-600 w-8 h-8" /> },
              { text: "Pelayanan Terbaik", icon: <CheckCircle className="text-green-600 w-8 h-8" /> },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 bg-white p-5 rounded-lg shadow-lg hover:scale-105 transition-transform duration-300"
              >
                {item.icon}
                <span className="text-gray-800 text-lg font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Gambar Tim */}
        <div className="mb-12">
          <Image
            src="/team.jpg"
            alt="Foto Tim Perusahaan"
            width={1280}
            height={720}
            className="rounded-lg shadow-lg w-full object-cover"
          />
        </div>

        {/* Informasi Kontak */}
        <section>
          <h2 className="text-3xl font-bold text-gray-800 mb-5">Hubungi Kami</h2>
          <div className="bg-white p-6 rounded-lg shadow-md">
            {[
              { label: "info@perusahaan.com", href: "mailto:info@perusahaan.com", Icon: Mail },
              { label: "+62 123 456 789", href: "tel:+62123456789", Icon: Phone },
              { label: "Jl. Sudirman No. 123, Jakarta, Indonesia", href: "#", Icon: MapPin },
            ].map(({ label, href, Icon }, index) => (
              <div key={index} className="flex items-center space-x-3 mb-4 hover:scale-105 transition-transform duration-300">
                <Icon className="text-orange-600 w-6 h-6" />
                <a href={href} className="text-gray-800 text-lg hover:text-orange-600 transition-colors duration-300">
                  {label}
                </a>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
