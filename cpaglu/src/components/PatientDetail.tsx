import React, { useState, useEffect } from 'react';
import { Calendar, Phone, AlertCircle, FileText, PlusCircle, Edit, Trash2, Heart, Activity, Thermometer, Droplet } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Enhanced Patient interface with updated vitals
interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  admissionDate: string;
  contactNumber: string;
  medicalCondition: string;
  vitals: {
    heartRate: number;
    bloodPressure: number;
    bloodPressureDiastolic?: number; // Added diastolic blood pressure
    temperature: number;
    oxygenSaturation: number;
  };
  classification?: string;
}

// Document interface
interface Document {
  id: string;
  patientId: string;
  name: string;
  url: string;
}

interface PatientDetailProps {
  patientName?: string; // Name of the selected patient from patientList
  patient: Patient | null;
  documents: Document[];
  onAddDocument: (patientId: string) => void;
  onEditPatient: (patient: Patient) => void;
  onDeletePatient: (patient: Patient) => void;
  setPatient: (patient: Patient | null) => void; // Required to update patient state
}

// Sample interface for vital sign history
interface VitalHistory {
  timestamp: string;
  heartRate: number;
  bloodPressure: number;
  bloodPressureDiastolic?: number;
  temperature: number;
  oxygenSaturation: number;
}

// API Response interface based on the provided sample
interface APIPatientResponse {
  "Admission Date": string;
  "Age": number;
  "BP_Diastolic": number;
  "BP_Systolic": number;
  "Classification": string;
  "Explanation": string;
  "Gender": string;
  "Heart Rate": number;
  "Name": string;
  "SpO2": number;
  "Temperature": number;
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

// Function to convert API response to Patient object
const convertAPIResponseToPatient = (apiData: APIPatientResponse): Patient => {
  // Ensure all required fields have fallback values
  return {
    id: apiData.Name ? apiData.Name.toLowerCase().replace(/\s+/g, '-') : `patient-${Date.now()}`,
    name: apiData.Name || 'Unknown Patient',
    age: apiData.Age || 0,
    gender: apiData.Gender || 'Unknown',
    admissionDate: apiData["Admission Date"] || new Date().toISOString().split('T')[0],
    contactNumber: 'N/A', // Not provided in API data
    medicalCondition: apiData.Explanation || 'N/A',
    vitals: {
      heartRate: apiData["Heart Rate"] || 0,
      // Store both systolic and diastolic values
      bloodPressure: apiData.BP_Systolic || 0,
      bloodPressureDiastolic: apiData.BP_Diastolic || 0,
      temperature: apiData.Temperature || 0,
      oxygenSaturation: apiData.SpO2 || 0
    },
    classification: apiData.Classification || ''
  };
};

const PatientDetail: React.FC<PatientDetailProps> = ({
  patientName,
  patient,
  documents,
  onAddDocument,
  onEditPatient,
  onDeletePatient,
  setPatient
}) => {
  const [vitalHistory, setVitalHistory] = useState<VitalHistory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch patient data when patientName changes
  useEffect(() => {
    if (patientName) {
      fetchPatientData(patientName);
    }
  }, [patientName]);

  const fetchPatientData = async (name: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Make the actual API call to your endpoint
      const response = await fetch(`http://localhost:8000/patients/${name}`);
      
      if (!response.ok) {
        throw new Error(`API returned status: ${response.status}`);
      }
      
      const apiData: APIPatientResponse = await response.json();
      console.log('API data received:', apiData);
      
      // Convert API data to Patient object
      const patientData = convertAPIResponseToPatient(apiData);
      console.log('Converted patient data:', patientData);
      
      // Update the patient state
      setPatient(patientData);
      
      // Generate mock vital history based on the fetched patient data
      generateMockVitalHistory(patientData);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching patient data');
      console.error('Error fetching patient data:', err);
      
      // Fallback to sample data for development/testing
      // Remove this in production environment
      try {
        const apiData: APIPatientResponse = {
          "Admission Date": "2025-02-02",
          "Age": 84,
          "BP_Diastolic": 53,
          "BP_Systolic": 139,
          "Classification": "Immediate",
          "Explanation": "The patient presents with a high temperature (40.02 °C), concerning blood pressure (139/53 mmHg), and significantly low SpO2 (87%). The low SpO2, particularly in an 84-year-old male, indicates severe respiratory compromise and requires immediate intervention. While the heart rate is within a reasonable range, the combination of hypoxia and fever necessitates immediate attention to prevent further deterioration. The wide pulse pressure (difference between systolic and diastolic BP) may also be concerning in this elderly patient.",
          "Gender": "Male",
          "Heart Rate": 96,
          "Name": "Aditya",
          "SpO2": 87,
          "Temperature": 40.02
        };
        
        console.log('Using fallback data:', apiData);
        
        // Convert API data to Patient object
        const patientData = convertAPIResponseToPatient(apiData);
        
        // Update the patient state
        setPatient(patientData);
        
        // Generate mock history based on the fetched patient data
        generateMockVitalHistory(patientData);
      } catch (fallbackErr) {
        console.error('Error using fallback data:', fallbackErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Generate mock vital sign history data for demonstration
  const generateMockVitalHistory = (patientData: Patient) => {
    if (!patientData || !patientData.vitals) return;
    
    const now = new Date();
    const history: VitalHistory[] = [];
    
    // Generate 24 hours of data points, one per hour
    for (let i = 24; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 60 * 60 * 1000);
      const timestamp = date.toISOString();
      
      const baseHr = patientData.vitals.heartRate;
      const baseBp = patientData.vitals.bloodPressure;
      const baseBpDiastolic = patientData.vitals.bloodPressureDiastolic || baseBp - 40;
      const baseTemp = patientData.vitals.temperature;
      const baseSpo2 = patientData.vitals.oxygenSaturation;
      
      // Add some variability to the data
      history.push({
        timestamp,
        heartRate: baseHr + Math.floor(Math.random() * 10 - 5),
        bloodPressure: baseBp + Math.floor(Math.random() * 20 - 10),
        bloodPressureDiastolic: baseBpDiastolic + Math.floor(Math.random() * 16 - 8),
        temperature: baseTemp + (Math.random() * 0.6 - 0.3),
        oxygenSaturation: Math.min(100, baseSpo2 + Math.floor(Math.random() * 4 - 2))
      });
    }
    
    setVitalHistory(history);
  };

  if (!patient) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
        <FileText size={48} className="mx-auto mb-4 text-gray-300" />
        <h3 className="text-xl font-medium">Select a patient to view details</h3>
      </div>
    );
  }

  let priorityTag = { label: 'Unknown', color: 'bg-gray-300' };
  
  // Use the classification from the API if available
  if (patient.classification) {
    const classification = patient.classification;
    if (classification === 'Immediate') {
      priorityTag = { label: 'Immediate', color: 'bg-red-500 text-white' };
    } else if (classification === 'Urgent') {
      priorityTag = { label: 'Urgent', color: 'bg-orange-500 text-white' };
    } else if (classification === 'Delayed') {
      priorityTag = { label: 'Delayed', color: 'bg-green-500 text-white' };
    }
  } else {
    priorityTag = getPriorityTag(patient);
  }
  
  const patientDocuments = documents.filter(doc => doc.patientId === patient.id);

  // Format timestamp for display in charts
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // Process data for charts
  const chartData = vitalHistory.map(record => ({
    ...record,
    time: formatTimestamp(record.timestamp)
  }));

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {isLoading && (
        <div className="p-4 bg-blue-50 text-center">
          <p className="text-blue-700">Loading patient data...</p>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-50 text-center">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
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
              <DetailItem icon={<Calendar size={16} />} text={`${patient.age} yrs, ${patient.gender}`} />
              <DetailItem icon={<Calendar size={16} />} text={`Admitted: ${patient.admissionDate}`} />
              {patient.contactNumber && (
                <DetailItem icon={<Phone size={16} />} text={patient.contactNumber} />
              )}
              <DetailItem icon={<AlertCircle size={16} className="text-red-600" />} text={patient.medicalCondition} />
            </div>
          </div>
          <div className="flex space-x-2">
            <ActionButton onClick={() => onEditPatient(patient)} icon={<Edit size={20} />} color="blue" title="Edit Patient" />
            <ActionButton onClick={() => onDeletePatient(patient)} icon={<Trash2 size={20} />} color="red" title="Delete Patient" />
          </div>
        </div>
      </div>

      {/* Current Vital Signs */}
      {patient.vitals && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Current Vital Signs</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <VitalSign 
              icon={<Heart className="text-red-500" size={20} />} 
              label="Heart Rate" 
              value={patient.vitals.heartRate} 
              unit="bpm"
              patient={patient}
            />
            <VitalSign 
              icon={<Activity className="text-blue-500" size={20} />} 
              label="Blood Pressure" 
              value={patient.vitals.bloodPressure} 
              unit="mmHg"
              patient={patient}
            />
            <VitalSign 
              icon={<Thermometer className="text-orange-500" size={20} />} 
              label="Temperature" 
              value={patient.vitals.temperature} 
              unit="°C"
              patient={patient}
            />
            <VitalSign 
              icon={<Droplet className="text-indigo-500" size={20} />} 
              label="O₂ Saturation" 
              value={patient.vitals.oxygenSaturation} 
              unit="%"
              patient={patient}
            />
          </div>
        </div>
      )}

      {/* Vital Signs Charts */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Vital Signs History</h3>
        
        {isLoading ? (
          <div className="text-center py-4">
            <p className="text-gray-500">Loading vital signs data...</p>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <p className="text-red-500">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Heart Rate Chart */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="text-md font-semibold mb-2 flex items-center">
                <Heart className="text-red-500 mr-2" size={18} />
                Heart Rate History
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={['dataMin - 10', 'dataMax + 10']} />
                    <Tooltip />
                    <Line type="monotone" dataKey="heartRate" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Blood Pressure Chart */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="text-md font-semibold mb-2 flex items-center">
                <Activity className="text-blue-500 mr-2" size={18} />
                Blood Pressure History
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="bloodPressure" name="Systolic" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="bloodPressureDiastolic" name="Diastolic" stroke="#93c5fd" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Temperature Chart */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="text-md font-semibold mb-2 flex items-center">
                <Thermometer className="text-orange-500 mr-2" size={18} />
                Temperature History
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                    <Tooltip />
                    <Line type="monotone" dataKey="temperature" stroke="#f97316" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* O2 Saturation Chart */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="text-md font-semibold mb-2 flex items-center">
                <Droplet className="text-indigo-500 mr-2" size={18} />
                O₂ Saturation History
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[85, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="oxygenSaturation" stroke="#6366f1" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Documents Section */}  
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

// VitalSign component
interface VitalSignProps {
  icon: JSX.Element;
  label: string;
  value: number;
  unit: string;
  patient: Patient;
}

const VitalSign: React.FC<VitalSignProps> = ({ icon, label, value, unit, patient }) => {
  // Format blood pressure to show both systolic and diastolic if available
  let displayValue = value;
  let displayUnit = unit;
  
  if (label === "Blood Pressure" && patient?.vitals?.bloodPressureDiastolic !== undefined) {
    displayValue = `${value}/${patient.vitals.bloodPressureDiastolic}`;
  }
  
  return (
    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center mb-2">{icon}<span className="text-sm font-medium text-gray-600 ml-2">{label}</span></div>
      <div className="flex items-baseline">
        <span className="text-2xl font-bold text-gray-800">{displayValue}</span>
        <span className="ml-1 text-gray-500 text-sm">{displayUnit}</span>
      </div>
    </div>
  );
};

// ActionButton component
const ActionButton: React.FC<{ onClick: () => void; icon: JSX.Element; color: string; title: string }> = ({ onClick, icon, color, title }) => (
  <button 
    onClick={onClick} 
    className={`p-2 rounded-full transition-colors ${color === 'blue' ? 'text-blue-600 hover:bg-blue-50' : 'text-red-600 hover:bg-red-50'}`} 
    title={title}
  >
    {icon}
  </button>
);

// DetailItem component
const DetailItem: React.FC<{ icon: JSX.Element; text: string }> = ({ icon, text }) => (
  <div className="flex items-center text-gray-600">
    {icon}
    <span className="ml-1">{text}</span>
  </div>
);

export default PatientDetail;