export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  condition: string,
  contactNumber: string;
  emergencyContact?: string;
  admissionDate?: string;
  medicalCondition?: string;
  notes?: string;
  vitals?: {
    heartRate: number;
    bloodPressure: number;
    temperature: number;
    oxygenSaturation: number;
  };
}

export interface Document {
  id: string;
  patientId: string;
  name: string;
  type: string;
  uploadDate: string;
  url: string;
}