import React, { useState } from "react";
import { Patient } from "../types";

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPatient: (newPatient: Omit<Patient, "id">) => void;
}

const AddPatientModal: React.FC<AddPatientModalProps> = ({ isOpen, onClose, onAddPatient }) => {
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState("");
  const [condition, setCondition] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [admissionDate, setAdmissionDate] = useState("");
  const [medicalCondition, setMedicalCondition] = useState("");
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !age || !gender || !condition) return;
    onAddPatient({
      name,
      age: age || 0,
      gender,
      condition: condition || "Not specified",
      contactNumber: contactNumber || "N/A",
      emergencyContact: emergencyContact || "N/A",
      admissionDate: admissionDate || new Date().toISOString(),
      medicalCondition: medicalCondition || "Unknown",
    });
    
    

    setName("");
    setAge("");
    setGender("");
    setCondition("");
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-96">
        <h2 className="text-xl font-semibold mb-4">Add Patient</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Age</label>
            <input
              type="number"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={age}
              onChange={(e) => setAge(e.target.value ? Number(e.target.value) : "")}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Gender</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              required
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Condition</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Contact Number</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Emergency Number</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              required
            />
          </div>
           
          <div>
            <label className="block text-sm font-medium text-gray-700">Admission Date</label>
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={admissionDate}
              onChange={(e) => setAdmissionDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Medical Condition</label>
            <input
              type="textarea"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={medicalCondition}
              onChange={(e) => setMedicalCondition(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Patient
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPatientModal;
