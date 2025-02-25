'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from "@/components/sidebar";
import toast, { Toaster } from "react-hot-toast";

type Tax = {
  id?: number;
  name: string;
  value: number;
  isActive?: boolean;
};

const EditTaxModal: React.FC<{
  tax: Tax;
  onClose: () => void;
  onSubmit: (tax: Tax) => void;
}> = ({ tax, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<Tax>(tax);

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
      <h2 className="text-xl font-bold mb-4">Edit Tax</h2>
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
          <label className="mr-2">Value (%):</label>
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

const AddTaxModal: React.FC<{
  onClose: () => void;
  onSubmit: (tax: Tax) => void;
}> = ({ onClose, onSubmit }) => {
  const initialData: Tax = {
    name: '',
    value: 0,
    isActive: true,
  };
  const [formData, setFormData] = useState<Tax>(initialData);

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
      <h2 className="text-xl font-bold mb-4">Add Tax</h2>
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
          <label className="mr-2">Value (%):</label>
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

const GetTax: React.FC = () => {
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTax, setSelectedTax] = useState<Tax | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  useEffect(() => {
    fetchTaxes();
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const fetchTaxes = async () => {
    try {
      const res = await axios.get('/api/tax');
      setTaxes(res.data);
    } catch (error) {
      console.error('Error fetching taxes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/tax/${id}`);
      alert("Berhasil hapus pajak!");
      fetchTaxes();
    } catch (error) {
      console.error('Error deleting tax:', error);
    }
  };

  const handleEdit = (tax: Tax) => {
    setSelectedTax(tax);
    setShowEditModal(true);
  };

  const handleUpdateTax = async (updatedTax: Tax) => {
    try {
      if (!updatedTax.id) return;
      await axios.put(`/api/tax/${updatedTax.id}`, updatedTax);
      alert("Berhasil edit pajak!");
      setShowEditModal(false);
      setSelectedTax(null);
      fetchTaxes();
    } catch (error) {
      console.error('Error updating tax:', error);
    }
  };

  const handleAddTax = async (newTax: Tax) => {
    try {
      await axios.post('/api/tax', newTax);
      alert("Berhasil buat pajak!");
      setShowAddModal(false);
      fetchTaxes();
    } catch (error) {
      console.error('Error adding tax:', error);
    }
  };

  const handleToggleStatus = async (id: number, newStatus: boolean) => {
    try {
      await axios.put(`/api/tax/${id}`, { isActive: newStatus });
      fetchTaxes();
    } catch (error) {
      console.error("Error toggling tax status:", error);
    }
  };

  return (
    <div className="p-4 mt-[85px]" style={{ marginLeft: isSidebarOpen ? "256px" : "80px" }}>
      <h1 className="text-2xl font-bold mb-4">Taxes</h1>
      <Sidebar onToggle={toggleSidebar} isOpen={isSidebarOpen} />
      <div className="mb-4">
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          Add Tax
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
                <th className="border border-gray-300 px-4 py-2">Value (%)</th>
                <th className="border border-gray-300 px-4 py-2">Active</th>
                <th className="border border-gray-300 px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {taxes.map((tax) => (
                <tr key={tax.id} className="text-center">
                  <td className="border border-gray-300 px-4 py-2">{tax.id}</td>
                  <td className="border border-gray-300 px-4 py-2">{tax.name}</td>
                  <td className="border border-gray-300 px-4 py-2">{tax.value}</td>
                  <td className="border border-gray-300 px-4 py-2">
                    {tax.isActive ? (
                      <span className="text-green-500 font-bold">Yes</span>
                    ) : (
                      <span className="text-red-500 font-bold">No</span>
                    )}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 space-x-2">
                    <button
                      onClick={() => handleEdit(tax)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                    >
                      Edit
                    </button>
                    {tax.isActive ? (
                      <button
                        onClick={() => tax.id && handleToggleStatus(tax.id, false)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                      >
                        Nonaktif
                      </button>
                    ) : (
                      <button
                        onClick={() => tax.id && handleToggleStatus(tax.id, true)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                      >
                        Aktifkan
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showEditModal && selectedTax && (
        <EditTaxModal
          tax={selectedTax}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTax(null);
          }}
          onSubmit={handleUpdateTax}
        />
      )}
      {showAddModal && (
        <AddTaxModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddTax}
        />
      )}
    </div>
  );
};

export default GetTax;
