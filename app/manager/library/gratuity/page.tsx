'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from "@/components/sidebar";
import toast from "react-hot-toast";

type Gratuity = {
  id?: number;
  name: string;
  value: number; // Dalam persentase, misal 5 untuk 5%
  isActive?: boolean;
};

const EditGratuityModal: React.FC<{
  gratuity: Gratuity;
  onClose: () => void;
  onSubmit: (gratuity: Gratuity) => void;
}> = ({ gratuity, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<Gratuity>(gratuity);

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
      <h2 className="text-xl font-bold mb-4">Edit Gratuity</h2>
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

const AddGratuityModal: React.FC<{
  onClose: () => void;
  onSubmit: (gratuity: Gratuity) => void;
}> = ({ onClose, onSubmit }) => {
  const initialData: Gratuity = {
    name: '',
    value: 0,
    isActive: true,
  };
  const [formData, setFormData] = useState<Gratuity>(initialData);

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
      <h2 className="text-xl font-bold mb-4">Add Gratuity</h2>
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

const GetGratuity: React.FC = () => {
  const [gratuities, setGratuities] = useState<Gratuity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedGratuity, setSelectedGratuity] = useState<Gratuity | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    fetchGratuities();
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const fetchGratuities = async () => {
    try {
      const res = await axios.get('/api/gratuity');
      setGratuities(res.data);
    } catch (error) {
      console.error('Error fetching gratuities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/gratuity/${id}`);
      toast.success("Berhasil hapus gratuity!");
      fetchGratuities();
    } catch (error) {
      console.error('Error deleting gratuity:', error);
    }
  };

  const handleEdit = (gratuity: Gratuity) => {
    setSelectedGratuity(gratuity);
    setShowEditModal(true);
  };

  const handleUpdateGratuity = async (updatedGratuity: Gratuity) => {
    try {
      if (!updatedGratuity.id) return;
      await axios.put(`/api/gratuity/${updatedGratuity.id}`, updatedGratuity);
      toast.success("Berhasil edit gratuity!");
      setShowEditModal(false);
      setSelectedGratuity(null);
      fetchGratuities();
    } catch (error) {
      console.error('Error updating gratuity:', error);
    }
  };

  const handleAddGratuity = async (newGratuity: Gratuity) => {
    try {
      await axios.post('/api/gratuity', newGratuity);
      toast.success("Berhasil buat gratuity!");
      setShowAddModal(false);
      fetchGratuities();
    } catch (error) {
      console.error('Error adding gratuity:', error);
    }
  };

  const handleToggleStatus = async (id: number, newStatus: boolean) => {
    try {
      await axios.put(`/api/gratuity/${id}`, { isActive: newStatus });
      fetchGratuities();
    } catch (error) {
      console.error("Error toggling gratuity status:", error);
    }
  };

  // Filter data gratuity berdasarkan input search
  const filteredGratuities = gratuities.filter((gratuity) =>
    gratuity.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 mt-[85px]" style={{ marginLeft: isSidebarOpen ? "256px" : "80px" }}>
      <h1 className="text-2xl font-bold mb-4">Gratuities</h1>
      <Sidebar onToggle={toggleSidebar} isOpen={isSidebarOpen} />
      <div className="mb-4 flex justify-between items-center">
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          Add Gratuity
        </button>
        <div className="w-1/3">
          <input
            type="text"
            placeholder="Search Gratuity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
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
              {filteredGratuities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-gray-300 px-4 py-2 text-center">
                    Data tidak ditemukan
                  </td>
                </tr>
              ) : (
                filteredGratuities.map((gratuity) => (
                  <tr key={gratuity.id} className="text-center">
                    <td className="border border-gray-300 px-4 py-2">{gratuity.id}</td>
                    <td className="border border-gray-300 px-4 py-2">{gratuity.name}</td>
                    <td className="border border-gray-300 px-4 py-2">{gratuity.value}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      {gratuity.isActive ? (
                        <span className="text-green-500 font-bold">Yes</span>
                      ) : (
                        <span className="text-red-500 font-bold">No</span>
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 space-x-2">
                      <button
                        onClick={() => handleEdit(gratuity)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                      >
                        Edit
                      </button>
                      {gratuity.isActive ? (
                        <button
                          onClick={() => gratuity.id && handleToggleStatus(gratuity.id, false)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                        >
                          Nonaktif
                        </button>
                      ) : (
                        <button
                          onClick={() => gratuity.id && handleToggleStatus(gratuity.id, true)}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                        >
                          Aktifkan
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {showEditModal && selectedGratuity && (
        <EditGratuityModal
          gratuity={selectedGratuity}
          onClose={() => {
            setShowEditModal(false);
            setSelectedGratuity(null);
          }}
          onSubmit={handleUpdateGratuity}
        />
      )}
      {showAddModal && (
        <AddGratuityModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddGratuity}
        />
      )}
     
    </div>
  );
};

export default GetGratuity;
