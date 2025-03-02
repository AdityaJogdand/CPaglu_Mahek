import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';

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

interface PatientListProps {
  onSelectPatient: (patient: Patient) => void;
}

const PatientList: React.FC<PatientListProps> = ({ onSelectPatient }) => {
  const [patients, setPatients] = useState<{ [key: string]: Patient }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [highlightedPatient, setHighlightedPatient] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const webSocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connectWebSocket = () => {
    console.log("Attempting to connect to WebSocket...");
    
    // Close existing connection if there is one
    if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
      webSocketRef.current.close();
    }

    const ws = new WebSocket('ws://localhost:8000/ws');
    
    ws.onopen = () => {
      console.log("WebSocket connection established");
      setConnected(true);
      setError(null);
      
      // Clear any pending reconnection attempts
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Send a heartbeat message every 30 seconds to keep the connection alive
      const heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('heartbeat');
        } else {
          clearInterval(heartbeatInterval);
        }
      }, 30000);
      
      webSocketRef.current = ws;
    };
    
    ws.onerror = (event) => {
      console.log("WebSocket error:", event);
      setError("Connection error. Attempting to reconnect...");
      setConnected(false);
    };
    
    ws.onclose = () => {
      console.log("WebSocket connection closed");
      setConnected(false);
      
      // Attempt to reconnect after a delay
      if (reconnectTimeoutRef.current === null) {
        reconnectTimeoutRef.current = window.setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connectWebSocket();
        }, 3000); // Retry after 3 seconds
      }
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'initial_data':
            console.log("Received initial data:", message.data);
            setPatients(message.data || {});
            setLoading(false);
            break;
            
          case 'update':
            console.log("Received patient update:", message.data);
            // Highlight the updated patient briefly
            setHighlightedPatient(message.data.Name);
            setTimeout(() => setHighlightedPatient(null), 2000);
            
            setPatients(prev => ({
              ...prev,
              [message.data.Name]: message.data
            }));
            break;
            
          case 'delete':
            console.log("Received patient deletion:", message.data);
            setPatients(prev => {
              const updated = { ...prev };
              delete updated[message.data.name];
              return updated;
            });
            break;
            
          default:
            console.log("Received unknown message type:", message);
        }
      } catch (err) {
        console.error("Error processing WebSocket message:", err);
      }
    };
  };
  
  // Initial connection
  useEffect(() => {
    connectWebSocket();
    
    // Cleanup function to close WebSocket and clear timeouts
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
      
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);
  
  // Fetch patients on initial load as a fallback
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch('http://localhost:8000/patients');
        if (response.ok) {
          const data = await response.json();
          setPatients(data || {});
        } else {
          console.error("Error fetching patients:", response.statusText);
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching patients:", err);
        setError("Failed to load patients. Please try again later.");
        setLoading(false);
      }
    };
    
    // Only fetch if we're still loading after 5 seconds (as a fallback)
    const timeoutId = setTimeout(() => {
      if (loading && Object.keys(patients).length === 0) {
        fetchPatients();
      }
    }, 5000);
    
    return () => clearTimeout(timeoutId);
  }, [loading, patients]);
  
  // Handle classification-based styling
  const getClassificationStyle = (classification: string) => {
    switch (classification.toLowerCase()) {
      case 'immediate':
        return 'bg-red-50 border-l-red-500 text-red-800';
      case 'urgent':
        return 'bg-yellow-50 border-l-yellow-500 text-yellow-800';
      case 'delayed':
        return 'bg-green-50 border-l-green-500 text-green-800';
      default:
        return 'bg-gray-50 border-l-gray-500 text-gray-800';
    }
  };

  const getClassificationBadgeStyle = (classification: string) => {
    switch (classification.toLowerCase()) {
      case 'immediate':
        return 'bg-red-600 text-white';
      case 'urgent':
        return 'bg-yellow-600 text-white';
      case 'delayed':
        return 'bg-green-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };
  
  // Get classification priority number for sorting
  const getClassificationPriority = (classification: string): number => {
    switch (classification.toLowerCase()) {
      case 'immediate': return 0;
      case 'urgent': return 1;
      case 'delayed': return 2;
      default: return 3;
    }
  };
  
  // Filter patients based on search query
  const filteredPatients = Object.values(patients).filter(patient => 
    patient.Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.Classification.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Sort patients first by priority, then by name
  const sortedPatients = filteredPatients.sort((a, b) => {
    const aPriority = getClassificationPriority(a.Classification);
    const bPriority = getClassificationPriority(b.Classification);
    
    // First sort by priority
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    // Then by name if same priority
    return a.Name.localeCompare(b.Name);
  });
  
  // Animation variants for list containers
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  // Animation variants for individual patient items
  const patientItemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { 
      opacity: 1, 
      x: 0,
      transition: { 
        type: "spring", 
        stiffness: 300,
        damping: 24
      }
    },
    exit: { 
      opacity: 0, 
      x: -20,
      transition: { duration: 0.2 }
    }
  };
  
  if (loading) {
    return (
      <motion.div 
        className="flex justify-center items-center h-64"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div 
          className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 1.5
          }}
        >
          <span className="text-white font-bold">Loading</span>
        </motion.div>
      </motion.div>
    );
  }
  
  return (
    <motion.div 
      className="p-6 bg-white shadow-lg rounded-lg transition-all duration-300 max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Patients ({filteredPatients.length})</h2>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto sm:items-center">
          {/* Search Bar */}
          <div className="relative flex-grow max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <motion.input
              type="text"
              placeholder="Search patients..."
              className="pl-10 pr-4 py-2 w-full rounded-full border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              whileFocus={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            />
          </div>
          
          {/* Connection Status */}
          <motion.div 
            className={`px-4 py-2 rounded-full text-sm font-medium flex items-center space-x-2 ${
              connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.span 
              className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
              animate={connected ? { 
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7]
              } : { scale: 1 }}
              transition={connected ? { 
                repeat: Infinity,
                duration: 2
              } : {}}
            />
            <span>{connected ? 'Connected' : 'Disconnected'}</span>
          </motion.div>
        </div>
      </div>
      
      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div 
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Patient Triage Summary */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium border border-red-200 shadow-sm">
          Immediate: {sortedPatients.filter(p => p.Classification.toLowerCase() === 'immediate').length}
        </div>
        <div className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-sm font-medium border border-yellow-200 shadow-sm">
          Urgent: {sortedPatients.filter(p => p.Classification.toLowerCase() === 'urgent').length}
        </div>
        <div className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-200 shadow-sm">
          Delayed: {sortedPatients.filter(p => p.Classification.toLowerCase() === 'delayed').length}
        </div>
      </div>
      
      {sortedPatients.length === 0 ? (
        <motion.div 
          className="text-center p-12 bg-gray-50 rounded-lg shadow-inner"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div 
            className="opacity-50 mb-4"
            animate={{ 
              y: [0, -10, 0],
              rotateZ: [0, -5, 0, 5, 0]
            }}
            transition={{ repeat: Infinity, duration: 3 }}
          >
            <svg className="w-20 h-20 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </motion.div>
          <p className="text-xl font-medium text-gray-500">No patients found</p>
          <p className="text-gray-400 mt-2">{searchQuery ? "Try adjusting your search" : "No patients available yet"}</p>
        </motion.div>
      ) : (
        <motion.div 
          className="space-y-3"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <AnimatePresence>
            {sortedPatients.map((patient) => (
              <motion.div
                key={patient.Name}
                className={`border-l-4 py-3 px-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 ${
                  highlightedPatient === patient.Name ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
                } ${getClassificationStyle(patient.Classification)}`}
                onClick={() => onSelectPatient(patient)}
                variants={patientItemVariants}
                layoutId={`patient-${patient.Name}`}
                whileHover={{ 
                  scale: 1.01,
                  x: 5
                }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-grow">
                    <div className="flex items-center justify-between">
                      <motion.h3 className="font-bold text-lg text-gray-800">{patient.Name}</motion.h3>
                      <motion.div 
                        className={`px-3 py-1 rounded-full text-xs font-bold ${getClassificationBadgeStyle(patient.Classification)}`}
                        whileHover={{ scale: 1.1 }}
                      >
                        {patient.Classification}
                      </motion.div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Age: {patient.Age} • Admitted: {patient.Admission_Date}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
};

export default PatientList;