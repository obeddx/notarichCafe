// pages/getDiscount.tsx
'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from "@/components/sidebar";
// import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";

type Discount = {
  id?: number;
  name: string;
  type: 'PERCENTAGE' | 'NORMAL';
  scope: 'MENU' | 'TOTAL';
  value: number;
  isActive?: boolean;
};

const EditDiscountModal: React.FC<{
  discount: Discount;
  onClose: () => void;
  onSubmit: (discount: Discount) => void;
}> = ({ discount, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<Discount>(discount);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'value'
          ? Number(value)
          : name === 'isActive'
          ? e.target.value === 'true'
          : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed top-10 right-10 z-50 bg-white p-6 rounded shadow-lg">
      <h2 className="text-xl font-bold mb-4">Edit Discount</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="mr-2">Name:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="border rounded p-1"
            required
          />
        </div>
        <div className="mb-4">
          <label className="mr-2">Type:</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="border rounded p-1"
          >
            <option value="PERCENTAGE">PERCENTAGE</option>
            <option value="NORMAL">NORMAL</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="mr-2">Scope:</label>
          <select
            name="scope"
            value={formData.scope}
            onChange={handleChange}
            className="border rounded p-1"
          >
            <option value="MENU">MENU</option>
            <option value="TOTAL">TOTAL</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="mr-2">Value:</label>
          <input
            type="number"
            name="value"
            value={formData.value}
            onChange={handleChange}
            className="border rounded p-1"
            required
          />
        </div>
        <div className="mb-4">
          <label className="mr-2">Active:</label>
          <select
            name="isActive"
            value={formData.isActive ? 'true' : 'false'}
            onChange={handleChange}
            className="border rounded p-1"
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div className="flex justify-end space-x-2">
          <button
            type="submit"
            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

const AddDiscountModal: React.FC<{
  onClose: () => void;
  onSubmit: (discount: Discount) => void;
}> = ({ onClose, onSubmit }) => {
  const initialData: Discount = {
    name: '',
    type: 'PERCENTAGE',
    scope: 'MENU',
    value: 0,
    isActive: true,
  };
  const [formData, setFormData] = useState<Discount>(initialData);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'value'
          ? Number(value)
          : name === 'isActive'
          ? e.target.value === 'true'
          : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed top-10 left-10 z-50 bg-white p-6 rounded shadow-lg">
      <h2 className="text-xl font-bold mb-4">Add Discount</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="mr-2">Name:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="border rounded p-1"
            required
          />
        </div>
        <div className="mb-4">
          <label className="mr-2">Type:</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="border rounded p-1"
          >
            <option value="PERCENTAGE">PERCENTAGE</option>
            <option value="NORMAL">NORMAL</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="mr-2">Scope:</label>
          <select
            name="scope"
            value={formData.scope}
            onChange={handleChange}
            className="border rounded p-1"
          >
            <option value="MENU">MENU</option>
            <option value="TOTAL">TOTAL</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="mr-2">Value:</label>
          <input
            type="number"
            name="value"
            value={formData.value}
            onChange={handleChange}
            className="border rounded p-1"
            required
          />
        </div>
        <div className="mb-4">
          <label className="mr-2">Active:</label>
          <select
            name="isActive"
            value={formData.isActive ? 'true' : 'false'}
            onChange={handleChange}
            className="border rounded p-1"
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div className="flex justify-end space-x-2">
          <button
            type="submit"
            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
          >
            Add
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

const GetDiscount: React.FC = () => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  useEffect(() => {
    fetchDiscounts();
  }, []);
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const fetchDiscounts = async () => {
    try {
      const res = await axios.get('/api/diskon');
      setDiscounts(res.data);
    } catch (error) {
      console.error('Error fetching discounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/diskon/${id}`);
      alert("Berhasil hapus diskon!")
      fetchDiscounts();
    } catch (error) {
      console.error('Error deleting discount:', error);
    }
  };

  const handleEdit = (discount: Discount) => {
    setSelectedDiscount(discount);
    setShowEditModal(true);
  };

  const handleUpdateDiscount = async (updatedDiscount: Discount) => {
    try {
      if (!updatedDiscount.id) return;
      await axios.put(`/api/diskon/${updatedDiscount.id}`, updatedDiscount);
      alert("Berhasil edit diskon!")
      setShowEditModal(false);
      setSelectedDiscount(null);
      fetchDiscounts();
    } catch (error) {
      console.error('Error updating discount:', error);
    }
  };

  const handleAddDiscount = async (newDiscount: Discount) => {
    try {
      await axios.post('/api/diskon', newDiscount);
      alert("Berhasil buat diskon!")
      setShowAddModal(false);
      fetchDiscounts();
    } catch (error) {
      console.error('Error adding discount:', error);
    }
  };

  return (
    <div className="p-4 mt-[85px]" style={{ marginLeft: isSidebarOpen ? "256px" : "80px" }}>
      <h1 className="text-2xl font-bold mb-4">Discounts</h1>
      <Sidebar onToggle={toggleSidebar} isOpen={isSidebarOpen} />
      <div className="mb-4">
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          Add Discount
        </button>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">ID</th>
                <th className="border border-gray-300 px-4 py-2">Name</th>
                <th className="border border-gray-300 px-4 py-2">Value</th>
                <th className="border border-gray-300 px-4 py-2">Type</th>
                <th className="border border-gray-300 px-4 py-2">Scope</th>
                <th className="border border-gray-300 px-4 py-2">Active</th>
                <th className="border border-gray-300 px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {discounts.map((discount) => (
                <tr key={discount.id} className="text-center">
                  <td className="border border-gray-300 px-4 py-2">{discount.id}</td>
                  <td className="border border-gray-300 px-4 py-2">{discount.name}</td>
                  <td className="border border-gray-300 px-4 py-2">{discount.value}</td>
                  <td className="border border-gray-300 px-4 py-2">{discount.type}</td>
                  <td className="border border-gray-300 px-4 py-2">{discount.scope}</td>
                  <td className="border border-gray-300 px-4 py-2">
  {discount.isActive ? (
    <span className="text-green-500 font-bold">Yes</span>
  ) : (
    <span className="text-red-500 font-bold">No</span>
  )}
</td>

                  <td className="border border-gray-300 px-4 py-2 space-x-2">
                    <button
                      onClick={() => handleEdit(discount)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => discount.id && handleDelete(discount.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                    >
                      Nonaktif
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showEditModal && selectedDiscount && (
        <EditDiscountModal
          discount={selectedDiscount}
          onClose={() => {
            setShowEditModal(false);
            setSelectedDiscount(null);
          }}
          onSubmit={handleUpdateDiscount}
        />
      )}
      {showAddModal && (
        <AddDiscountModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddDiscount}
        />
      )}
    </div>
  );
};

export default GetDiscount;
