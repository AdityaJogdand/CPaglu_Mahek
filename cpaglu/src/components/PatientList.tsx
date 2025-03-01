import { useEffect, useState } from "react";
import { Patient } from "../types";
import { FileText, ChevronRight } from "lucide-react";

interface PatientListProps {
  onSelectPatient: (patient: Patient) => void;
}

const PatientList: React.FC<PatientListProps> = ({ onSelectPatient }: PatientListProps) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch("http://0.0.0.0:8000/patients/"); // Local API
        if (!response.ok) {
          throw new Error("Failed to fetch patients");
        }
        const data: Patient[] = await response.json();
        setPatients(data);
      } catch (err) {
        setError("Error fetching patients");
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Patients</h2>

      {loading && <p className="text-gray-500 text-center py-4">Loading patients...</p>}
      {error && <p className="text-red-500 text-center py-4">{error}</p>}

      {!loading && !error && patients.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No patients registered</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {patients.map((patient) => (
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
