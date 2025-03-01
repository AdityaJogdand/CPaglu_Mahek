import React from 'react';
import { PlusCircle } from 'lucide-react';

interface HeaderProps {
  onAddPatient: () => void;
}

const Header: React.FC<HeaderProps> = ({ onAddPatient }) => {
  return (
    <header className="bg-blue-700 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Crisis Management System</h1>
          <p className="text-sm">Rapid Assessment & Patient Management</p>
        </div>
        <button
          onClick={onAddPatient}
          className="bg-white text-blue-700 px-4 py-2 rounded-md flex items-center font-medium hover:bg-blue-50 transition-colors"
        >
          <PlusCircle className="mr-2" size={20} />
          Add Patient
        </button>
      </div>
    </header>
  );
};

export default Header;