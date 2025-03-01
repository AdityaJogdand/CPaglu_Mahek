import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Patient } from '../types';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  patient: Patient | null;
  onClose: () => void;
  onConfirmDelete: (patientId: string) => void;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ 
  isOpen, 
  patient, 
  onClose, 
  onConfirmDelete 
}) => {
  if (!isOpen || !patient) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Delete Patient</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex items-center mb-4 text-amber-600">
            <AlertTriangle size={24} className="mr-2" />
            <h3 className="text-lg font-semibold">Warning</h3>
          </div>
          
          <p className="mb-4 text-gray-700">
            Are you sure you want to delete <span className="font-semibold">{patient.name}</span>? 
            This action will also delete all associated documents and cannot be undone.
          </p>
          
          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirmDelete(patient.id)}
              className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;