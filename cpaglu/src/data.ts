import { Patient, Document } from './types';

// Sample data for demonstration
export const patients: Patient[] = [
  {
    id: '1',
    name: 'John Doe',
    age: 45,
    gender: 'Male',
    contactNumber: '555-123-4567',
    emergencyContact: '555-987-6543',
    admissionDate: '2025-05-15',
    medicalCondition: 'Trauma - Vehicle Accident',
    notes: 'Patient has history of hypertension',
    vitals: {
      heartRate: 88,
      bloodPressure: '135/85',
      temperature: '37.2',
      oxygenSaturation: 97
    }
  },
  {
    id: '2',
    name: 'Jane Smith',
    age: 32,
    gender: 'Female',
    contactNumber: '555-234-5678',
    emergencyContact: '555-876-5432',
    admissionDate: '2025-05-16',
    medicalCondition: 'Respiratory Distress',
    notes: 'Patient is asthmatic',
    vitals: {
      heartRate: 92,
      bloodPressure: '120/80',
      temperature: '38.1',
      oxygenSaturation: 95
    }
  }
];

export const documents: Document[] = [
  {
    id: '1',
    patientId: '1',
    name: 'Admission Form',
    type: 'PDF',
    uploadDate: '2025-05-15',
    url: '#'
  },
  {
    id: '2',
    patientId: '1',
    name: 'X-Ray Results',
    type: 'Image',
    uploadDate: '2025-05-15',
    url: '#'
  },
  {
    id: '3',
    patientId: '2',
    name: 'Medical History',
    type: 'PDF',
    uploadDate: '2025-05-16',
    url: '#'
  }
];