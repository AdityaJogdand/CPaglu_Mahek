import React, { useState } from 'react';
import { Patient } from '../types';
import { FileText, ChevronRight, Search } from 'lucide-react';
import { getPriorityTag } from './PatientDetail';


interface PatientListProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
}

// Define allowed priority values
type Priority = 'Immediate' | 'Urgent' | 'Delayed';

const priorityOrder: Record<Priority, number> = {
  Immediate: 1,
  Urgent: 2,
  Delayed: 3,
};

// Function to get the correct tag color
const getTagColor = (priority: Priority) => {
  switch (priority) {
    case 'Immediate': return 'bg-red-100 text-red-600';   // 🔴 Red for Immediate
    case 'Urgent': return 'bg-orange-100 text-orange-600'; // 🟠 Orange for Urgent
    case 'Delayed': return 'bg-green-100 text-green-600'; // 🟢 Green for Delayed
    default: return '';
  }
};

const PatientList: React.FC<PatientListProps> = ({ patients, onSelectPatient }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter & sort patients by priority
  const filteredPatients = patients
  .filter((patient) => patient.name.toLowerCase().includes(searchQuery.toLowerCase()))
  .sort((a, b) => {
    const priorityA = getPriorityTag(a).label as Priority;
    const priorityB = getPriorityTag(b).label as Priority;
    return priorityOrder[priorityA] - priorityOrder[priorityB];
  });


  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Patients</h2>

      {/* 🔍 Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search patients..."
          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredPatients.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No matching patients</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {filteredPatients.map((patient) => (
            <li key={patient.id} className="py-3">
              <button
                onClick={() => onSelectPatient(patient)}
                className="w-full text-left flex items-center justify-between hover:bg-gray-50 p-2 rounded-md transition-colors"
              >
                <div className="flex items-center">
                  <div className="bg-blue-100 p-2 rounded-full mr-3">
                    <FileText className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{patient.name}</p>
                    <p className="text-sm text-gray-500">
                      {patient.age} yrs • {patient.medicalCondition}
                    </p>
                  </div>
                </div>
                {/* Priority Tag */}
                <span className={`px-2 py-1 text-xs font-semibold rounded-md ${getTagColor(getPriorityTag(patient).label as Priority)}`}>
                        {getPriorityTag(patient).label}
                         </span>
                <ChevronRight className="text-gray-400" size={20} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PatientList;
