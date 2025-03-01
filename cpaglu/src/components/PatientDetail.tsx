import React from 'react';
import { Patient, Document } from '../types';
import { Calendar, Phone, AlertCircle, FileText, PlusCircle, Edit, Trash2, Heart, Activity, Thermometer, Droplet } from 'lucide-react';

interface PatientDetailProps {
  patient: Patient | null;
  documents: Document[];
  onAddDocument: (patientId: string) => void;
  onEditPatient: (patient: Patient) => void;
  onDeletePatient: (patient: Patient) => void;
}

const PatientDetail: React.FC<PatientDetailProps> = ({ 
  patient, 
  documents, 
  onAddDocument,
  onEditPatient,
  onDeletePatient
}) => {
  if (!patient) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
        <FileText size={48} className="mx-auto mb-4 text-gray-300" />
        <h3 className="text-xl font-medium">Select a patient to view details</h3>
      </div>
    );
  }

  const patientDocuments = documents.filter(doc => doc.patientId === patient.id);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-blue-50 p-6 border-b border-blue-100">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{patient.name}</h2>
            <div className="mt-2 flex flex-wrap gap-4">
              <div className="flex items-center text-gray-600">
                <Calendar size={16} className="mr-1" />
                <span>Admitted: {patient.admissionDate}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Phone size={16} className="mr-1" />
                <span>{patient.contactNumber}</span>
              </div>
              <div className="flex items-center text-red-600">
                <AlertCircle size={16} className="mr-1" />
                <span>{patient.medicalCondition}</span>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => onEditPatient(patient)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
              title="Edit Patient"
            >
              <Edit size={20} />
            </button>
            <button 
              onClick={() => onDeletePatient(patient)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="Delete Patient"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {patient.vitals && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Vital Signs</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center mb-2">
                <Heart className="text-red-500 mr-2" size={20} />
                <span className="text-sm font-medium text-gray-600">Heart Rate</span>
              </div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-gray-800">{patient.vitals.heartRate}</span>
                <span className="ml-1 text-gray-500 text-sm">bpm</span>
              </div>
            </div>
            
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center mb-2">
                <Activity className="text-blue-500 mr-2" size={20} />
                <span className="text-sm font-medium text-gray-600">Blood Pressure</span>
              </div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-gray-800">{patient.vitals.bloodPressure}</span>
                <span className="ml-1 text-gray-500 text-sm">mmHg</span>
              </div>
            </div>
            
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center mb-2">
                <Thermometer className="text-orange-500 mr-2" size={20} />
                <span className="text-sm font-medium text-gray-600">Temperature</span>
              </div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-gray-800">{patient.vitals.temperature}</span>
                <span className="ml-1 text-gray-500 text-sm">°C</span>
              </div>
            </div>
            
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center mb-2">
                <Droplet className="text-indigo-500 mr-2" size={20} />
                <span className="text-sm font-medium text-gray-600">O₂ Saturation</span>
              </div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-gray-800">{patient.vitals.oxygenSaturation}</span>
                <span className="ml-1 text-gray-500 text-sm">%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Patient Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Age</p>
              <p>{patient.age} years</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Gender</p>
              <p>{patient.gender}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Emergency Contact</p>
              <p>{patient.emergencyContact}</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Notes</h3>
          <p className="bg-gray-50 p-3 rounded-md text-gray-700">{patient.notes}</p>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-gray-800">Documents</h3>
            <button 
              onClick={() => onAddDocument(patient.id)}
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <PlusCircle size={18} className="mr-1" />
              <span>Add Document</span>
            </button>
          </div>
          
          {patientDocuments.length === 0 ? (
            <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-md">No documents available</p>
          ) : (
            <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
              {patientDocuments.map((doc) => (
                <li key={doc.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                  <div className="flex items-center">
                    <FileText className="text-blue-600 mr-2" size={18} />
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-sm text-gray-500">{doc.type} • {doc.uploadDate}</p>
                    </div>
                  </div>
                  <a href={doc.url} className="text-blue-600 hover:underline text-sm">View</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientDetail;