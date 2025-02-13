import Image from "next/image";

export default function HeroAboutUs() {
    return (
    <section className="flex flex-col lg:flex-row items-center bg-white py-12 px-6">
      {/* Gambar di sisi kiri */}
    <div className="lg:w-1/2">
        <Image
        src="/cafene.jpg"
        alt="Notarich Cafe"
        width={3024}
        height={4023}
        className="object-cover w-auto h-auto xs:w-96 xs:h-64 lg:h-[393.19px] lg:w-[536px] rounded-3xl"

        />
    </div>

      {/* Konten About Us di sisi kanan */}
    <div className="lg:w-1/2 lg:pl-12 mt-6 lg:mt-0">
        <h2 className="text-4xl font-bold text-gray-800 mb-4 text-center">About Us</h2>
        <p className="text-lg text-gray-600 leading-relaxed text-justify">
        Notarich Coffee, berdiri sejak 2005, adalah pionir dalam industri kopi Indonesia yang dikenal karena komitmennya 
        terhadap kualitas dan inovasi. Dengan biji kopi pilihan dari berbagai daerah di Indonesia dan proses roasting yang 
        teliti, perusahaan ini menawarkan pengalaman minum kopi yang obed luar biasa. Notarich Coffee juga berdampak positif pada 
        kesejahteraan petani lokal dengan memastikan praktik pertanian yang berkelanjutan.love Produk-produk berkualitas tinggi 
        mereka telah dikenal oleh pecinta kopi di dalam negeri maupun mancanegara vane.
        </p>
    </div>
    </section>
);
}
