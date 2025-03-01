import React, { useState } from 'react';
import Header from './components/Header';
import PatientList from './components/PatientList';
import PatientDetail from './components/PatientDetail';
import AddPatientModal from './components/AddPatientModal';
import EditPatientModal from './components/EditPatientModal';
import AddDocumentModal from './components/AddDocumentModal';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import Navigation from './components/Navigation';
import { Patient, Document } from './types';
import { patients as initialPatients, documents as initialDocuments } from './data';

function App() {
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [isEditPatientModalOpen, setIsEditPatientModalOpen] = useState(false);
  const [isAddDocumentModalOpen, setIsAddDocumentModalOpen] = useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [selectedPatientForDocument, setSelectedPatientForDocument] = useState<string | null>(null);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState('patients');

  const handleAddPatient = (newPatient: Omit<Patient, 'id'>) => {
    const patientWithId = {
      ...newPatient,
      id: (patients.length + 1).toString(),
      vitals: {
        heartRate: Math.floor(Math.random() * 40) + 60, // 60-100 bpm
        bloodPressure: `${Math.floor(Math.random() * 40) + 100}/${Math.floor(Math.random() * 20) + 60}`, // 100-140/60-80
        temperature: (Math.random() * 1.5 + 36.5).toFixed(1), // 36.5-38.0 °C
        oxygenSaturation: Math.floor(Math.random() * 5) + 95 // 95-100%
      }
    };
    
    setPatients([...patients, patientWithId]);
    setIsAddPatientModalOpen(false);
  };

  const handleEditPatient = (updatedPatient: Patient) => {
    const updatedPatients = patients.map(patient => 
      patient.id === updatedPatient.id ? updatedPatient : patient
    );
    
    setPatients(updatedPatients);
    
    // Update selected patient if it's the one being edited
    if (selectedPatient && selectedPatient.id === updatedPatient.id) {
      setSelectedPatient(updatedPatient);
    }
    
    setIsEditPatientModalOpen(false);
    setPatientToEdit(null);
  };

  const handleDeletePatient = (patientId: string) => {
    // Remove the patient
    const updatedPatients = patients.filter(patient => patient.id !== patientId);
    setPatients(updatedPatients);
    
    // Remove all documents associated with this patient
    const updatedDocuments = documents.filter(doc => doc.patientId !== patientId);
    setDocuments(updatedDocuments);
    
    // If the deleted patient was selected, clear the selection
    if (selectedPatient && selectedPatient.id === patientId) {
      setSelectedPatient(null);
    }
    
    setIsDeleteConfirmationOpen(false);
    setPatientToDelete(null);
  };

  const openEditPatientModal = (patient: Patient) => {
    setPatientToEdit(patient);
    setIsEditPatientModalOpen(true);
  };

  const openDeleteConfirmation = (patient: Patient) => {
    setPatientToDelete(patient);
    setIsDeleteConfirmationOpen(true);
  };

  const handleAddDocument = (newDocument: Omit<Document, 'id'>) => {
    const documentWithId = {
      ...newDocument,
      id: (documents.length + 1).toString()
    };
    
    setDocuments([...documents, documentWithId]);
    setIsAddDocumentModalOpen(false);
    setSelectedPatientForDocument(null);
  };

  const openAddDocumentModal = (patientId: string) => {
    setSelectedPatientForDocument(patientId);
    setIsAddDocumentModalOpen(true);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'patients':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <PatientList 
                patients={patients} 
                onSelectPatient={setSelectedPatient} 
              />
            </div>
            
            <div className="md:col-span-2">
              <PatientDetail 
                patient={selectedPatient} 
                documents={documents}
                onAddDocument={openAddDocumentModal}
                onEditPatient={openEditPatientModal}
                onDeletePatient={openDeleteConfirmation}
              />
            </div>
          </div>
        );
      case 'resources':
        return (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold mb-4">Resources</h2>
            <p className="text-gray-600">Manage crisis resources and equipment inventory here.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h3 className="font-semibold text-lg mb-2">Medical Supplies</h3>
                <p className="text-sm text-gray-600">Track and manage medical supplies inventory</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <h3 className="font-semibold text-lg mb-2">Equipment</h3>
                <p className="text-sm text-gray-600">Monitor critical equipment status</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                <h3 className="font-semibold text-lg mb-2">Facilities</h3>
                <p className="text-sm text-gray-600">Manage available facilities and beds</p>
              </div>
            </div>
          </div>
        );
      case 'doctors':
        return (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold mb-4">Doctors</h2>
            <p className="text-gray-600">Manage medical staff and assignments.</p>
            <div className="mt-6 border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patients</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap">Dr. Sarah Johnson</td>
                    <td className="px-6 py-4 whitespace-nowrap">Emergency Medicine</td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Available</span></td>
                    <td className="px-6 py-4 whitespace-nowrap">3</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap">Dr. Michael Chen</td>
                    <td className="px-6 py-4 whitespace-nowrap">Trauma Surgery</td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">In Surgery</span></td>
                    <td className="px-6 py-4 whitespace-nowrap">1</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap">Dr. Emily Rodriguez</td>
                    <td className="px-6 py-4 whitespace-nowrap">Critical Care</td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">On Call</span></td>
                    <td className="px-6 py-4 whitespace-nowrap">5</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold mb-4">User Settings</h2>
            <p className="text-gray-600">Manage your account and preferences.</p>
            <div className="mt-6 space-y-6">
              <div className="border-b pb-6">
                <h3 className="text-lg font-medium mb-3">Profile Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input type="text" className="w-full p-2 border border-gray-300 rounded-md" defaultValue="Admin User" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" className="w-full p-2 border border-gray-300 rounded-md" defaultValue="admin@crisis-management.org" />
                  </div>
                </div>
              </div>
              <div className="border-b pb-6">
                <h3 className="text-lg font-medium mb-3">Notification Settings</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input type="checkbox" id="email-notifications" className="mr-2" defaultChecked />
                    <label htmlFor="email-notifications">Email notifications</label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" id="sms-notifications" className="mr-2" defaultChecked />
                    <label htmlFor="sms-notifications">SMS notifications</label>
                  </div>
                </div>
              </div>
              <div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Changes</button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <Header onAddPatient={() => setIsAddPatientModalOpen(true)} />
      
      <main className="container mx-auto py-6 px-4">
        {renderContent()}
      </main>
      
      <AddPatientModal 
        isOpen={isAddPatientModalOpen}
        onClose={() => setIsAddPatientModalOpen(false)}
        onAddPatient={handleAddPatient}
      />
      
      <EditPatientModal 
        isOpen={isEditPatientModalOpen}
        patient={patientToEdit}
        onClose={() => {
          setIsEditPatientModalOpen(false);
          setPatientToEdit(null);
        }}
        onEditPatient={handleEditPatient}
      />
      
      <AddDocumentModal 
        isOpen={isAddDocumentModalOpen}
        patientId={selectedPatientForDocument}
        onClose={() => {
          setIsAddDocumentModalOpen(false);
          setSelectedPatientForDocument(null);
        }}
        onAddDocument={handleAddDocument}
      />
      
      <DeleteConfirmationModal
        isOpen={isDeleteConfirmationOpen}
        patient={patientToDelete}
        onClose={() => {
          setIsDeleteConfirmationOpen(false);
          setPatientToDelete(null);
        }}
        onConfirmDelete={handleDeletePatient}
      />
    </div>
  );
}

export default App;