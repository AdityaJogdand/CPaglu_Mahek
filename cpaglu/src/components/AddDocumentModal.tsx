import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { Document } from '../types';

interface AddDocumentModalProps {
  isOpen: boolean;
  patientId: string | null;
  onClose: () => void;
  onAddDocument: (document: Omit<Document, 'id'>) => void;
}

const AddDocumentModal: React.FC<AddDocumentModalProps> = ({ 
  isOpen, 
  patientId, 
  onClose, 
  onAddDocument 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    file: null as File | null
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, file: e.target.files![0] }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patientId) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    onAddDocument({
      patientId,
      name: formData.name,
      type: formData.type,
      uploadDate: today,
      url: formData.file ? URL.createObjectURL(formData.file) : '#'
    });
    
    setFormData({
      name: '',
      type: '',
      file: null
    });
  };

  if (!isOpen || !patientId) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Add Document</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Document Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Medical History, X-Ray Report"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Document Type *
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Type</option>
              <option value="PDF">PDF</option>
              <option value="Image">Image</option>
              <option value="Text">Text</option>
              <option value="Lab Report">Lab Report</option>
              <option value="Prescription">Prescription</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div className="mb-6">
            <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
              Upload File *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
              <input
                type="file"
                id="file"
                onChange={handleFileChange}
                className="hidden"
                required
              />
              <label htmlFor="file" className="cursor-pointer">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-1 text-sm text-gray-500">
                  {formData.file ? formData.file.name : 'Click to upload or drag and drop'}
                </p>
              </label>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Add Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDocumentModal;