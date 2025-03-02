import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Patient {
  Name: string;
  Temperature: number;
  BP_Systolic: number;
  BP_Diastolic: number;
  SpO2: number;
  Heart_Rate: number;
  Age: number;
  Gender: string;
  Classification: string;
  Explanation: string;
  Admission_Date: string;
}

interface PatientDetailProps {
  patient: Patient | null;
}

// Mock historical data for demo purposes
const generateMockHistory = (patient: Patient | null) => {
  if (!patient) return [];
  
  const baseTime = new Date();
  const history = [];
  
  // Generate data points for the past 12 hours (1 per hour)
  for (let i = 12; i >= 0; i--) {
    const time = new Date(baseTime);
    time.setHours(baseTime.getHours() - i);
    
    // Generate slight variations in vital signs
    const tempVariation = (Math.random() * 0.6) - 0.3;
    const hrVariation = Math.floor((Math.random() * 10) - 5);
    const sysVariation = Math.floor((Math.random() * 10) - 5);
    const diasVariation = Math.floor((Math.random() * 6) - 3);
    const spo2Variation = (Math.random() * 2) - 1;
    
    history.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      Temperature: parseFloat((patient.Temperature + tempVariation).toFixed(1)),
      Heart_Rate: patient.Heart_Rate + hrVariation,
      BP_Systolic: patient.BP_Systolic + sysVariation,
      BP_Diastolic: patient.BP_Diastolic + diasVariation,
      SpO2: Math.min(100, Math.max(90, patient.SpO2 + spo2Variation))
    });
  }
  
  return history;
};

const PatientDetail: React.FC<PatientDetailProps> = ({ patient }) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [vitalData, setVitalData] = useState<any[]>([]);
  const [showAllData, setShowAllData] = useState<boolean>(false);
  
  useEffect(() => {
    // Generate mock historical data when patient changes
    if (patient) {
      setVitalData(generateMockHistory(patient));
    }
  }, [patient]);
  
  // Function to determine styling based on classification
  const getClassificationColor = (classification: string) => {
    switch (classification.toLowerCase()) {
      case 'immediate':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'urgent':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'delayed':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };
  
  // Function to evaluate vital sign status
  const getVitalSignStatus = (name: string, value: number) => {
    // These ranges are simplified and should be adjusted according to medical guidelines
    switch (name) {
      case 'Temperature':
        if (value < 35) return 'text-blue-600'; // Low
        if (value > 38) return 'text-red-600'; // High
        return 'text-green-600'; // Normal
        
      case 'BP_Systolic':
        if (value < 90) return 'text-blue-600'; // Low
        if (value > 140) return 'text-red-600'; // High
        return 'text-green-600'; // Normal
        
      case 'BP_Diastolic':
        if (value < 60) return 'text-blue-600'; // Low
        if (value > 90) return 'text-red-600'; // High
        return 'text-green-600'; // Normal
        
      case 'SpO2':
        if (value < 95) return 'text-red-600'; // Low
        return 'text-green-600'; // Normal
        
      case 'Heart_Rate':
        if (value < 60) return 'text-blue-600'; // Low
        if (value > 100) return 'text-red-600'; // High
        return 'text-green-600'; // Normal
        
      default:
        return 'text-gray-600';
    }
  };
  
  // Get icon for vital sign
  const getVitalIcon = (name: string) => {
    switch (name) {
      case 'Temperature': return '🌡️';
      case 'BP_Systolic': 
      case 'BP_Diastolic': return '🫀';
      case 'SpO2': return '💨';
      case 'Heart_Rate': return '❤️';
      default: return '📊';
    }
  };
  
  // Get line color for charts
  const getLineColor = (name: string) => {
    switch (name) {
      case 'Temperature': return '#ef4444';
      case 'BP_Systolic': return '#3b82f6';
      case 'BP_Diastolic': return '#60a5fa';
      case 'SpO2': return '#10b981';
      case 'Heart_Rate': return '#ec4899';
      default: return '#6b7280';
    }
  };
  
  if (!patient) {
    return (
      <div className="p-8 bg-gray-50 rounded-lg text-center shadow-inner animate-fadeIn">
        <div className="opacity-50 mb-4">
          <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <p className="text-lg text-gray-500 font-medium">No patient selected</p>
        <p className="text-sm text-gray-400 mt-2">Select a patient from the list to view details</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md transition-all duration-500 animate-fadeIn">
      {/* Patient header */}
      <div className="flex justify-between items-start p-6 border-b">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg">
            {patient.Name.charAt(0)}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{patient.Name}</h2>
            <p className="text-gray-500">
              {patient.Age} y/o {patient.Gender} • Admitted: {patient.Admission_Date}
            </p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-full font-semibold border ${getClassificationColor(patient.Classification)}`}>
          {patient.Classification}
        </div>
      </div>
      
      {/* Tab navigation */}
      <div className="border-b px-6">
        <nav className="flex space-x-6">
          <button
            className={`py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'trends' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('trends')}
          >
            Vital Trends
          </button>
          <button
            className={`py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'assessment' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('assessment')}
          >
            Assessment
          </button>
        </nav>
      </div>
      
      {/* Tab content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="animate-fadeIn">
            {/* Vital signs overview */}
            <h3 className="text-lg font-semibold mb-3">Current Vital Signs</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded shadow-sm transition-transform hover:transform hover:scale-105">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">Temperature</p>
                  <span className="text-2xl">🌡️</span>
                </div>
                <p className={`text-xl font-semibold ${getVitalSignStatus('Temperature', patient.Temperature)}`}>
                  {patient.Temperature} °C
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded shadow-sm transition-transform hover:transform hover:scale-105">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">Blood Pressure</p>
                  <span className="text-2xl">🫀</span>
                </div>
                <p className="text-xl font-semibold">
                  <span className={getVitalSignStatus('BP_Systolic', patient.BP_Systolic)}>{patient.BP_Systolic}</span>
                  {' / '}
                  <span className={getVitalSignStatus('BP_Diastolic', patient.BP_Diastolic)}>{patient.BP_Diastolic}</span>
                  {' mmHg'}
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded shadow-sm transition-transform hover:transform hover:scale-105">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">Oxygen Saturation</p>
                  <span className="text-2xl">💨</span>
                </div>
                <p className={`text-xl font-semibold ${getVitalSignStatus('SpO2', patient.SpO2)}`}>
                  {patient.SpO2}%
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded shadow-sm transition-transform hover:transform hover:scale-105">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">Heart Rate</p>
                  <span className="text-2xl">❤️</span>
                </div>
                <p className={`text-xl font-semibold ${getVitalSignStatus('Heart_Rate', patient.Heart_Rate)}`}>
                  {patient.Heart_Rate} BPM
                </p>
              </div>
            </div>
            
            {/* Patient summary */}
            <h3 className="text-lg font-semibold mb-3">Patient Summary</h3>
            <div className="p-4 bg-gray-50 rounded shadow-sm mb-4">
              <p className="text-gray-700 whitespace-pre-line">{patient.Explanation}</p>
            </div>
          </div>
        )}
        
        {activeTab === 'trends' && (
          <div className="animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Vital Sign Trends</h3>
              <button 
                className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                onClick={() => setShowAllData(!showAllData)}
              >
                {showAllData ? 'Show Individual Charts' : 'Show Combined Chart'}
              </button>
            </div>
            
            {showAllData ? (
              <div className="bg-white p-4 rounded shadow-sm h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={vitalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Temperature" stroke={getLineColor('Temperature')} dot={false} name="Temp (°C)" />
                    <Line type="monotone" dataKey="Heart_Rate" stroke={getLineColor('Heart_Rate')} dot={false} name="HR (BPM)" />
                    <Line type="monotone" dataKey="BP_Systolic" stroke={getLineColor('BP_Systolic')} dot={false} name="BP Sys" />
                    <Line type="monotone" dataKey="BP_Diastolic" stroke={getLineColor('BP_Diastolic')} dot={false} name="BP Dia" />
                    <Line type="monotone" dataKey="SpO2" stroke={getLineColor('SpO2')} dot={false} name="SpO2 (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['Temperature', 'Heart_Rate', 'BP_Systolic', 'SpO2'].map((vitalSign) => (
                  <div key={vitalSign} className="bg-white p-4 rounded shadow-sm h-56 transition-transform hover:shadow-md">
                    <h4 className="text-sm font-medium mb-2 flex items-center">
                      <span className="mr-2">{getVitalIcon(vitalSign)}</span>
                      {vitalSign === 'BP_Systolic' ? 'Blood Pressure' : vitalSign.replace('_', ' ')}
                    </h4>
                    <ResponsiveContainer width="100%" height="85%">
                      <LineChart data={vitalData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        {vitalSign === 'BP_Systolic' ? (
                          <>
                            <Line type="monotone" dataKey="BP_Systolic" stroke={getLineColor('BP_Systolic')} dot={false} name="Systolic" />
                            <Line type="monotone" dataKey="BP_Diastolic" stroke={getLineColor('BP_Diastolic')} dot={false} name="Diastolic" />
                          </>
                        ) : (
                          <Line type="monotone" dataKey={vitalSign} stroke={getLineColor(vitalSign)} dot={false} />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'assessment' && (
          <div className="animate-fadeIn">
            <h3 className="text-lg font-semibold mb-3">Medical Assessment</h3>
            <div className="p-6 bg-gray-50 rounded shadow-sm">
              <div className="flex items-start space-x-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  patient.Classification.toLowerCase() === 'immediate' ? 'bg-red-100 text-red-600' :
                  patient.Classification.toLowerCase() === 'urgent' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                }`}>
                  {patient.Classification.toLowerCase() === 'immediate' ? '!' : 
                   patient.Classification.toLowerCase() === 'urgent' ? '⚠️' : '✓'}
                </div>
                <div>
                  <h4 className="font-semibold">{patient.Classification} Priority</h4>
                </div>
              </div>
              <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                {patient.Explanation}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Add the necessary CSS animations
const cssStyles = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-fadeIn {
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
`;

// Create a style element to inject the animations
const StyleInjector = () => {
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = cssStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  return null;
};

const PatientDetailWithStyles: React.FC<PatientDetailProps> = (props) => {
  return (
    <>
      <StyleInjector />
      <PatientDetail {...props} />
    </>
  );
};

export default PatientDetailWithStyles;