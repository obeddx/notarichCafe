"use client";

import Image from "next/image";

const reviews = [
  {
    text: "Cocok untuk bawa anak. Selama bocil merasa nyaman, akan menjadi tempat rujukan acara keluarga. Moga sering ada promo dan live music",
    profilePicture: "/wisnu.png",
    name: "Wisnu Issantoso",
    dateTime: "10 Februari 2025 - 14:32",
  },
  {
    text: "Sudah dua kali saya menjajal tempat makan di sudut kota ini, makanan yang disajikan tidak kalah dengan resto di kota2 besar, dengan porsi yang besar dan rasa yang pas membuat resto ini memiliki daya tarik tersendiri, di tambah pramusaji yang ramah, tempat yang sangat well menurut saya",
    profilePicture: "/fajar.png",
    name: "Fajar Apit Kurniawan",
    dateTime: "10 Februari 2025 - 14:32",
  },
  {
    text: "Suasana bagus, Barista Ramah harga bersahabat, snack dan coffee rasanya enak",
    profilePicture: "/ilham.png",
    name: "Ilham Hamdani",
    dateTime: "10 Februari 2025 - 14:32",
  },
];

export default function ClientReviews() {
  return (
    <section className="py-12 bg-gray-50 px-6">
      <h2 className="text-4xl font-bold text-center text-gray-800 mb-10">Apa Kata Mereka</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {reviews.map((review, index) => (
          <div key={index} className="bg-white rounded-2xl shadow-lg p-6">
            <p className="text-gray-700 italic mb-6">{review.text}</p>

            {/* Info Profil */}
            <div className="flex items-center">
              <Image
                src={review.profilePicture}
                alt={review.name}
                width={50}
                height={50}
                className="rounded-full border"
              />
              <div className="ml-4">
                <p className="font-semibold text-gray-800">{review.name}</p>
                <p className="text-sm text-gray-500">{review.dateTime}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
