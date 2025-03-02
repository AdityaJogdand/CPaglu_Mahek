import { useEffect, useState } from "react";
import { Patient } from "../types";
import { FileText, ChevronRight, Search, Loader2, LayoutGrid, List } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PatientListProps {
  onSelectPatient: (patient: Patient) => void;
}

const PatientList: React.FC<PatientListProps> = ({ onSelectPatient }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredPatient, setHoveredPatient] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch("http://localhost:8000/patients");
        if (!response.ok) {
          throw new Error("Failed to fetch patients");
        }

        const data = await response.json();

        if (typeof data === "object" && !Array.isArray(data)) {
          const patientsArray = Object.entries(data).map(([name, details]) => ({
            id: name,
            name,
            ...(typeof details === "object" ? details : {}),
            classification: details?.["Classification"] || "Unknown",
            age: details?.["Age"] || "N/A",
          }));

          setPatients(patientsArray);
        } else {
          throw new Error("Invalid response format: Expected an object");
        }
      } catch (err) {
        console.error("Error fetching patients:", err);
        setError("Error fetching patients");
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const getClassificationStyles = (classification?: string) => {
    if (!classification) return "bg-gray-200 text-gray-700";
    
    switch (classification.toLowerCase()) {
      case "immediate":
        return "bg-gradient-to-r from-red-500 to-red-600 text-white";
      case "urgent":
        return "bg-gradient-to-r from-amber-400 to-amber-500 text-black";
      case "delayed":
        return "bg-gradient-to-r from-green-500 to-green-600 text-white";
      default:
        return "bg-gray-200 text-gray-700";
    }
  };

  const getBadgeColor = (classification?: string) => {
    if (!classification) return "bg-gray-100 text-gray-700";
    
    switch (classification.toLowerCase()) {
      case "immediate":
        return "bg-red-100 text-red-800";
      case "urgent":
        return "bg-amber-100 text-amber-800";
      case "delayed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Sorting: Immediate → Urgent → Delayed
  const sortedPatients = [...patients].sort((a, b) => {
    const priorityOrder = { immediate: 1, urgent: 2, delayed: 3 };
    return (priorityOrder[a.classification?.toLowerCase()] || 4) - (priorityOrder[b.classification?.toLowerCase()] || 4);
  });

  // Filtered list based on search input
  const filteredPatients = sortedPatients.filter((patient) =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Custom CSS for scrollbar - modified to always show scrollbar
  const scrollbarStyles = `
    /* Always show scrollbar */
    .always-show-scrollbar {
      overflow-y: scroll;
    }
    
    .always-show-scrollbar::-webkit-scrollbar {
      width: 8px;
      background: rgba(0, 0, 0, 0.05);
      border-radius: 10px;
    }
    
    .always-show-scrollbar::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.05);
      border-radius: 10px;
    }
    
    .always-show-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.15);
      border-radius: 10px;
    }
    
    .always-show-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.25);
    }

    /* Firefox */
    .always-show-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: rgba(0, 0, 0, 0.15) rgba(0, 0, 0, 0.05);
    }
  `;

  return (
    <motion.div 
      className="p-6 bg-white rounded-3xl shadow-lg flex flex-col h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <style>{scrollbarStyles}</style>
      
      <motion.div 
        className="flex items-center justify-between mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-2xl font-bold text-gray-800">Patients</h2>
        
        <div className="flex space-x-4">
          <div className="flex space-x-2">
            <motion.div 
              className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 flex items-center space-x-1"
              whileHover={{ scale: 1.05 }}
            >
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>Immediate</span>
            </motion.div>
            <motion.div 
              className="px-3 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 flex items-center space-x-1"
              whileHover={{ scale: 1.05 }}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Urgent</span>
            </motion.div>
            <motion.div 
              className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 flex items-center space-x-1"
              whileHover={{ scale: 1.05 }}
            >
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span>Delayed</span>
            </motion.div>
          </div>
          
          <div className="bg-gray-100 p-1 rounded-lg flex">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded transition-colors ${viewMode === "list" ? "bg-white shadow-sm" : "hover:bg-gray-200"}`}
            >
              <List className="w-5 h-5 text-gray-600" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded transition-colors ${viewMode === "grid" ? "bg-white shadow-sm" : "hover:bg-gray-200"}`}
            >
              <LayoutGrid className="w-5 h-5 text-gray-600" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="relative mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <motion.div
          animate={{
            boxShadow: searchFocused 
              ? "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
              : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          }}
          transition={{ duration: 0.3 }}
          className="relative w-full bg-gray-50 rounded-xl overflow-hidden"
        >
          <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
          
          <input
            type="text"
            placeholder="Search patients by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="pl-12 pr-10 py-3 w-full border transition-colors duration-300 rounded-xl focus:outline-none bg-gray-50"
            style={{ borderColor: searchFocused ? "#3b82f6" : "#e5e7eb" }}
          />
          
          <AnimatePresence mode="wait">
            {searchTerm && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 bg-gray-200 w-5 h-5 flex items-center justify-center rounded-full"
                onClick={() => setSearchTerm("")}
              >
                ✕
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {loading && (
        <motion.div 
          className="flex flex-col items-center justify-center py-12 flex-grow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Loading patients...</p>
        </motion.div>
      )}

      {error && (
        <motion.div 
          className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </motion.div>
      )}

      {!loading && !error && filteredPatients.length === 0 && (
        <motion.div
          className="flex flex-col items-center justify-center py-12 flex-grow text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-medium">No matching patients found</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your search criteria</p>
        </motion.div>
      )}

      {/* Modified container with fixed height for scrolling */}
      <div className="always-show-scrollbar flex-grow relative" style={{ maxHeight: "calc(100% - 150px)" }}>
        {!loading && !error && filteredPatients.length > 0 && (
          viewMode === "list" ? (
            <ul className="space-y-4 pr-2">
              {filteredPatients.map((patient, index) => (
                <motion.li
                  key={patient.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ 
                    duration: 0.3,
                    delay: index * 0.05,
                    ease: "easeOut"
                  }}
                  onClick={() => onSelectPatient(patient)}
                  onMouseEnter={() => setHoveredPatient(patient.id)}
                  onMouseLeave={() => setHoveredPatient(null)}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl cursor-pointer shadow-sm hover:shadow-md transition-all ${
                    getClassificationStyles(patient.classification)
                  }`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-white/30 p-2 rounded-full">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{patient.name}</p>
                      <p className="text-sm opacity-90">{patient.age} years old</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="px-4 py-1.5 text-sm font-medium rounded-full bg-white/30 backdrop-blur-sm">
                      {patient.classification || "Unknown"}
                    </span>

                    <motion.div
                      animate={{
                        x: hoveredPatient === patient.id ? 5 : 0,
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </motion.div>
                  </div>
                </motion.li>
              ))}
            </ul>
          ) : (
            <div className="grid grid-cols-2 gap-4 pr-2">
              {filteredPatients.map((patient, index) => (
                <motion.div
                  key={patient.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ 
                    duration: 0.3,
                    delay: index * 0.05,
                    ease: "easeOut"
                  }}
                  onClick={() => onSelectPatient(patient)}
                  onMouseEnter={() => setHoveredPatient(patient.id)}
                  onMouseLeave={() => setHoveredPatient(null)}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all p-4 cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-full ${getBadgeColor(patient.classification)} bg-opacity-20`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getBadgeColor(patient.classification)}`}>
                      {patient.classification || "Unknown"}
                    </span>
                  </div>
                  
                  <div className="mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">{patient.name}</h3>
                    <p className="text-sm text-gray-500">{patient.age} years old</p>
                  </div>
                  
                  <motion.div 
                    className="flex justify-end items-center mt-2 text-gray-400 text-sm"
                    animate={{
                      x: hoveredPatient === patient.id ? 5 : 0,
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    View details <ChevronRight className="w-4 h-4 ml-1" />
                  </motion.div>
                </motion.div>
              ))}
            </div>
          )
        )}
      </div>
    </motion.div>
  );
};

export default PatientList;