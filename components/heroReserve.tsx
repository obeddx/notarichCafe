import Image from "next/image";

export default function HowToReserve() {
  return (
    <section className="py-12 px-6 bg-gray-50">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-gray-800">How to Make a Reservation</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {[
          {
            image: "/booking.png",
            title: "Step 1: Pilih Meja",
            description: "Pilihlah meja yang Anda inginkan dari pilihan yang tersedia",
          },
          {
            image: "/pesen.png",
            title: "Step 2: Isi Datadiri",
            description: "Silahkan isi data diri yang dibutuhkan",
          },
          {
            image: "/payonline.png",
            title: "Step 3: Pilih tanggal dan waktu reservasi",
            description: "Bayar dengan dompet digital kesayangan Anda",
          },
          {
            image: "/servis.png",
            title: "Step 4: Buat Reservasi",
            description: "Nikmati Layanan Anda",
          },
        ].map((step, index) => (
          <div
            key={index}
            className="text-center bg-white rounded-2xl shadow-lg p-6 transition-transform duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-orange-300/50"
          >
            <div className="w-full h-48 flex justify-center items-center bg-transparent">
              <Image
                src={step.image}
                alt={step.title}
                width={150}
                height={150}
                className="object-contain w-auto h-full rounded-lg"
              />
            </div>
            <div className="mt-4">
              <p className="text-lg font-semibold text-black">{step.title}</p>
              <p className="text-gray-600">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
