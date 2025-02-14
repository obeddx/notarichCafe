// pages/daily-ingredient-stock.tsx
'use client'
import { useState, ChangeEvent } from 'react';
import Sidebar from "@/components/sidebar";

interface Ingredient {
  date: string;
  ingredientId: number;
  ingredientName: string;
  start: number;
  stockIn: number;
  used: number;
  wasted: number;
  stock: number;
  stockMin: number;
}

const DailyIngredientStock = () => {
  const [date, setDate] = useState<string>('');
  const [data, setData] = useState<Ingredient[]>([]);

  const fetchData = async (selectedDate: string) => {
    try {
      const res = await fetch(`/api/dailyingredientstock?date=${selectedDate}`);
      if (!res.ok) {
        throw new Error('Error fetching data');
      }
      const json: Ingredient[] = await res.json();
      setData(json);
    } catch (error) {
      console.error('Error: ', error);
      setData([]);
    }
  };

  const handleSearch = () => {
    if (date) {
      fetchData(date);
    }
  };

  const formattedDate =
    data.length > 0
      ? new Date(data[0].date).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
        })
      : '';

  return (
    <div className="p-4 mt-[85px] ml-0 sm:ml-64">
      <div className="bg-white shadow rounded-lg p-6">
     
      
        <h1 className="text-3xl font-bold text-center mb-6">Daily Ingredient Stock</h1>
        <Sidebar />
        <div className="flex flex-col sm:flex-row items-center justify-center mb-6">
          <label htmlFor="date" className="mr-2 font-medium text-gray-700">
            Pilih Tanggal:
          </label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
          />
          <button 
            onClick={handleSearch}
            className="ml-2 mt-2 sm:mt-0 bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded shadow">
            Cari
          </button>
        </div>

        {data.length > 0 ? (
          <>
            <div className="mb-4 text-center text-lg font-semibold text-gray-800">
              Tanggal: {formattedDate}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Ingredient ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Ingredient Name</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Start</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Stock In</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Used</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Wasted</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Stock Min</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((ingredient, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ingredient.ingredientId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ingredient.ingredientName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{ingredient.start}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{ingredient.stockIn}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{ingredient.used}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{ingredient.wasted}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{ingredient.stock}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{ingredient.stockMin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-center text-gray-600">Tidak ada data untuk tanggal yang dipilih.</p>
        )}
      </div>
    </div>
  );
};

export default DailyIngredientStock;
