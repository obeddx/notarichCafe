"use client";

import { useState } from "react";
import SidebarCashier from "@/components/sidebarCashier";

const Bookinge = () => {
  const [selectedFloor, setSelectedFloor] = useState(1); // Default Lantai 1

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 fixed h-full">
        <SidebarCashier />
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 p-8">
        <div className="w-full sm:px-6 lg:px-28">
          <h2 className="text-3xl font-semibold mb-8 text-black">Pilih Meja Anda</h2>
          
          {/* Floor Selection */}
          <form className="mb-8">
            <label className="px-4">
              <input
                type="radio"
                name="floor"
                value="1"
                checked={selectedFloor === 1}
                onChange={() => setSelectedFloor(1)}
                className="checked:bg-[#FF8A00]"
              />{" "}
              Lantai 1
            </label>
            <label className="px-4">
              <input
                type="radio"
                name="floor"
                value="2"
                checked={selectedFloor === 2}
                onChange={() => setSelectedFloor(2)}
                className="checked:bg-[#FF8A00]"
              />{" "}
              Lantai 2
            </label>
          </form>

          {/* Floor Layout */}
          <div className="lg:w-full bg-[#F5F2E9] rounded-3xl lg:overflow-hidden xs:overflow-x-scroll xs:scroll xs:scroll-smooth xs:scrollbar-hide">
            {selectedFloor === 1 ? (
              <>
                <div className="xs:w-[1300px] lg:w-full flex flex-row px-40 py-28">
                  {/* LANTAI 1 SECTION KIRI */}
                  <div className="w-1/2 flex flex-col lg:items-start">
                    <div className="flex flex-row">
                      <div className="bg-[#D9D9D9] px-44 py-2">Tangga</div>
                    </div>
                    <div className="flex flex-row mt-6">
                      <div className="bg-[#D9D9D9] px-20 py-4">Toilet</div>
                    </div>
                    <div className="flex flex-row mt-10">
                      <div className="flex flex-col justify-center items-center mx-4">
                        <div className="xs:flex xs:flex-row lg:grid lg:grid-cols-3 gap-2 my-2">
                          <div className="w-8 h-20 bg-yellow-500"></div>
                          <div className="w-12 h-20 bg-gray-800">
                            <p className="font-bold text-white text-center">1</p>
                          </div>
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-8 h-8 bg-yellow-500"></div>
                            <div className="w-8 h-8 bg-yellow-500"></div>
                          </div>
                        </div>
                        <div className="xs:flex xs:flex-row lg:grid lg:grid-cols-3 gap-2 my-2">
                          <div className="w-8 h-20 bg-yellow-500"></div>
                          <div className="w-12 h-20 bg-gray-800">
                            <p className="font-bold text-white text-center">2</p>
                          </div>
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-8 h-8 bg-yellow-500"></div>
                            <div className="w-8 h-8 bg-yellow-500"></div>
                          </div>
                        </div>
                        <div className="xs:flex xs:flex-row lg:grid lg:grid-cols-3 gap-2 my-2">
                          <div className="w-8 h-20 bg-yellow-500"></div>
                          <div className="w-12 h-20 bg-gray-800">
                            <p className="font-bold text-white text-center">3</p>
                          </div>
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-8 h-8 bg-yellow-500"></div>
                            <div className="w-8 h-8 bg-yellow-500"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col justify-center items-center mx-4">
                        <div className="xs:flex xs:flex-row lg:grid lg:grid-cols-3 gap-2 my-2">
                          <div className="w-8 h-8 bg-yellow-500 mt-2"></div>
                          <div className="w-12 h-12 bg-gray-800">
                            <p className="font-bold text-white text-center">4</p>
                          </div>
                          <div className="w-8 h-8 bg-yellow-500 mt-2"></div>
                        </div>
                        <div className="xs:flex xs:flex-row lg:grid lg:grid-cols-3 gap-2 my-2">
                          <div className="w-8 h-8 bg-yellow-500 mt-2"></div>
                          <div className="w-12 h-12 bg-gray-800">
                            <p className="font-bold text-white text-center">5</p>
                          </div>
                          <div className="w-8 h-8 bg-yellow-500 mt-2"></div>
                        </div>
                        <div className="xs:flex xs:flex-row lg:grid lg:grid-cols-3 gap-2 my-2">
                          <div className="w-8 h-8 bg-yellow-500 mt-2"></div>
                          <div className="w-12 h-12 bg-gray-800">
                            <p className="font-bold text-white text-center">6</p>
                          </div>
                          <div className="w-8 h-8 bg-yellow-500 mt-2"></div>
                        </div>
                        <div className="xs:flex xs:flex-row lg:grid lg:grid-cols-3 gap-2 my-2">
                          <div className="w-8 h-8 bg-yellow-500 mt-2"></div>
                          <div className="w-12 h-12 bg-gray-800">
                            <p className="font-bold text-white text-center">7</p>
                          </div>
                          <div className="w-8 h-8 bg-yellow-500 mt-2"></div>
                        </div>
                      </div>
                    </div>
                    {/* SECTION BAWAH KIRI */}
                    <div className="flex flex-row mt-10">
                      <div className="flex flex-col gap-2 my-2">
                        <div className="xs:flex xs:flex-row lg:grid lg:grid-cols-6 gap-7">
                          <div className="w-8 h-8 bg-yellow-500 mx-1"></div>
                          <div className="w-8 h-8 bg-yellow-500 mx-1"></div>
                          <div className="w-8 h-8 bg-yellow-500 mx-1"></div>
                          <div className="w-8 h-8 bg-yellow-500 mx-1"></div>
                          <div className="w-8 h-8 bg-yellow-500 mx-1"></div>
                          <div className="w-8 h-8 bg-yellow-500 mx-1"></div>
                        </div>
                        <div className="flex flex-row items-center">
                          <div className="w-48 h-12 bg-gray-800">
                            <p className="font-bold text-white text-left">8</p>
                          </div>
                          <div className="w-48 h-12 bg-gray-800">
                            <p className="font-bold text-white text-right">9</p>
                          </div>
                        </div>
                        <div className="flex flex-row items-center">
                          <div className="w-96 h-8 bg-yellow-500"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION KANAN */}
                  <div className="w-1/2 flex flex-col lg:items-end">
                    <div className="flex flex-row">
                      <div className="px-44 py-2 bg-[#D9D9D9]">Tangga</div>
                    </div>
                    <div className="flex flex-row mt-6 mb-2">
                      <div className="flex flex-col mx-2 gap-16">
                        <div className="w-8 h-8 bg-yellow-500 mx-1"></div>
                        <div className="w-8 h-8 bg-yellow-500 mx-1"></div>
                        <div className="w-8 h-8 bg-yellow-500 mx-1"></div>
                        <div className="w-8 h-8 bg-yellow-500 mx-1"></div>
                      </div>
                      <div className="flex flex-row">
                        <div className="w-10 h-80 bg-[#444243]">
                          <p className="font-bold text-white">10</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="px-28 py-32 bg-[#D9D9D9]">Kitchen</div>
                        <div className="flex flex-row">
                          <div className="flex flex-col">
                            <div className="w-32 h-10 bg-[#444243]">
                              <p className="font-bold text-white">11</p>
                            </div>
                            <div className="flex flex-row gap-8 mt-4">
                              <div className="w-8 h-8 bg-yellow-500 mx-1"></div>
                              <div className="w-8 h-8 bg-yellow-500 mx-1"></div>
                            </div>
                          </div>
                          <div className="px-16 py-32 bg-[#D9D9D9]">Bar</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="xs:w-[1300px] lg:w-full flex flex-row justify-between mt-12 px-40">
                  <div className="flex justify-center flex-grow">
                    <div className="bg-[#DBAA61] text-center items-center px-24 py-3 ml-52">
                      Pintu
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="text-center py-3 mx-4">Non Smoking</div>
                    <div className="text-center py-3 mx-4">Full AC</div>
                  </div>
                </div>
                <hr className="bg-[#D9D9D9] border-0 dark:bg-gray-700 h-1 xs:w-[1300px] lg:mx-40"></hr>

                <div className="flex flex-col xs:w-[1300px] lg:w-full justify-center mt-4 px-40 pb-28">
                  <div className="text-center items-center px-24 py-3">
                    Keterangan
                  </div>
                  <div className="text-center items-center px-24 py-3">
                    <div className="flex flex-row items-center justify-center gap-40">
                      <div className="flex flex-row">
                        <div className="w-12 h-6 bg-gray-800 mr-2"></div>
                        <p>Meja Tersedia</p>
                      </div>
                      <div className="flex flex-row">
                        <div className="w-12 h-6 bg-[#D02323] mr-2"></div>
                        <p>Meja Tidak Tersedia</p>
                      </div>
                      <div className="flex flex-row">
                        <div className="w-12 h-6 bg-yellow-500 mr-2"></div>
                        <p>Kursi/Sofa</p>
                      </div>
                      <div className="flex flex-row">
                        <div className="w-12 h-6 bg-[#FF8A00] mr-2"></div>
                        <p>proses masak</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div>Lantai 2</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Bookinge;