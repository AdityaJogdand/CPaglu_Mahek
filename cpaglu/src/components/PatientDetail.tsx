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

// Priority tag function
export const getPriorityTag = (patient: Patient) => {
  if (!patient.vitals) return { label: 'Unknown', color: 'bg-gray-300' };

  const { heartRate, bloodPressure, temperature, oxygenSaturation } = patient.vitals;
  const age = patient.age;

  const isImmediate =
    heartRate > 120 || heartRate < 50 ||
    bloodPressure > 180 || bloodPressure < 90 ||
    temperature > 39 || temperature < 35 ||
    oxygenSaturation < 90;

  const isUrgent =
    (heartRate >= 100 && heartRate <= 120) ||
    (bloodPressure >= 140 && bloodPressure <= 180) ||
    (temperature >= 38 && temperature <= 39) ||
    (oxygenSaturation >= 90 && oxygenSaturation <= 94) ||
    age >= 70;

  if (isImmediate) return { label: 'Immediate', color: 'bg-red-500 text-white' };
  if (isUrgent) return { label: 'Urgent', color: 'bg-orange-500 text-white' };
  return { label: 'Delayed', color: 'bg-green-500 text-white' };
};

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

  const priorityTag = getPriorityTag(patient);
  const patientDocuments = documents.filter(doc => doc.patientId === patient.id);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-blue-50 p-6 border-b border-blue-100">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center">
              <h2 className="text-2xl font-bold text-gray-800">{patient.name}</h2>
              <span className={`ml-3 px-3 py-1 rounded-full text-sm font-semibold ${priorityTag.color}`}>
                {priorityTag.label}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-4">
              <DetailItem icon={<Calendar size={16} />} text={`Admitted: ${patient.admissionDate}`} />
              <DetailItem icon={<Phone size={16} />} text={patient.contactNumber} />
              <DetailItem icon={<AlertCircle size={16} className="text-red-600" />} text={patient.medicalCondition} />
            </div>
          </div>
          <div className="flex space-x-2">
            <ActionButton onClick={() => onEditPatient(patient)} icon={<Edit size={20} />} color="blue" title="Edit Patient" />
            <ActionButton onClick={() => onDeletePatient(patient)} icon={<Trash2 size={20} />} color="red" title="Delete Patient" />
          </div>
        </div>
      </div>

      {patient.vitals && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Vital Signs</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <VitalSign icon={<Heart className="text-red-500" size={20} />} label="Heart Rate" value={patient.vitals.heartRate} unit="bpm" />
            <VitalSign icon={<Activity className="text-blue-500" size={20} />} label="Blood Pressure" value={patient.vitals.bloodPressure} unit="mmHg" />
            <VitalSign icon={<Thermometer className="text-orange-500" size={20} />} label="Temperature" value={patient.vitals.temperature} unit="°C" />
            <VitalSign icon={<Droplet className="text-indigo-500" size={20} />} label="O₂ Saturation" value={patient.vitals.oxygenSaturation} unit="%" />
          </div>
        </div>
      )}

      
        
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-2 text-gray-800">Documents</h3>
        <button onClick={() => onAddDocument(patient.id)} className="flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-2">
          <PlusCircle size={18} className="mr-1" />
          <span>Add Document</span>
        </button>

        {patientDocuments.length === 0 ? (
          <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-md">No documents available</p>
        ) : (
          <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
            {patientDocuments.map((doc) => (
              <li key={doc.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                <DetailItem icon={<FileText className="text-blue-600" size={18} />} text={doc.name} />
                <a href={doc.url} className="text-blue-600 hover:underline text-sm">View</a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// ✅ Fix: Add missing types for `VitalSign` component
interface VitalSignProps {
  icon: JSX.Element;
  label: string;
  value: number;
  unit: string;
}

const VitalSign: React.FC<VitalSignProps> = ({ icon, label, value, unit }) => (
  <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
    <div className="flex items-center mb-2">{icon}<span className="text-sm font-medium text-gray-600 ml-2">{label}</span></div>
    <div className="flex items-baseline"><span className="text-2xl font-bold text-gray-800">{value}</span><span className="ml-1 text-gray-500 text-sm">{unit}</span></div>
  </div>
);

// ✅ Fix: Add missing `ActionButton` component
const ActionButton: React.FC<{ onClick: () => void; icon: JSX.Element; color: string; title: string }> = ({ onClick, icon, color, title }) => (
  <button onClick={onClick} className={`p-2 text-${color}-600 hover:bg-${color}-50 rounded-full transition-colors`} title={title}>
    {icon}
  </button>
);

// ✅ Fix: Add missing `DetailItem` component
const DetailItem: React.FC<{ icon: JSX.Element; text: string }> = ({ icon, text }) => (
  <div className="flex items-center text-gray-600">
    {icon}
    <span className="ml-1">{text}</span>
  </div>
);

export default PatientDetail;
