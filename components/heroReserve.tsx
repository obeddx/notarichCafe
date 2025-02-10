import Image from "next/image";

export default function HowToReserve() {
  return (
    <section className="py-12 px-6 bg-gray-50">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-gray-800">How to Make a Reservation</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Step 1 */}
        <div className="text-center">
          <div className="w-full h-48 flex justify-center items-center bg-transparent">
            <Image
              src="/booking.png"
              alt="Step 1"
              width={150}
              height={150}
              className="object-contain w-auto h-full rounded-lg shadow-lg"
            />
          </div>
          <div className="mt-4">
            <p className="text-lg font-semibold text-black">Step 1: Pilih Meja</p>
            <p className="text-gray-600">Pilihlah meja yang Anda inginkan dari pilihan yang tersedia</p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="text-center">
          <div className="w-full h-48 flex justify-center items-center bg-transparent">
            <Image
              src="/pesen.png"
              alt="Step 2"
              width={150}
              height={150}
              className="object-contain w-auto h-full rounded-lg shadow-lg"
            />
          </div>
          <div className="mt-4">
            <p className="text-lg font-semibold text-black">Step 2: Lihat Menu</p>
            <p className="text-gray-600">Silahkan pilih menu yang Anda inginkan dari daftar menu</p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="text-center">
          <div className="w-full h-48 flex justify-center items-center bg-transparent">
            <Image
              src="/payonline.png"
              alt="Step 3"
              width={150}
              height={150}
              className="object-contain w-auto h-full rounded-lg shadow-lg"
            />
          </div>
          <div className="mt-4">
            <p className="text-lg font-semibold text-black">Step 3: Pilih Metode Pembayaran</p>
            <p className="text-gray-600">Bayar dengan dompet digital kesayangan Anda</p>
          </div>
        </div>

        {/* Step 4 */}
        <div className="text-center">
          <div className="w-full h-48 flex justify-center items-center bg-transparent">
            <Image
              src="/servis.png"
              alt="Step 4"
              width={150}
              height={150}
              className="object-contain w-auto h-full rounded-lg shadow-lg"
            />
          </div>
          <div className="mt-4">
            <p className="text-lg font-semibold text-black">Step 4: Konfirmasi Pesanan</p>
            <p className="text-gray-600">Nikmati Layanan Anda</p>
          </div>
        </div>
      </div>
    </section>
  );
}
