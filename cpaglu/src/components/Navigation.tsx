import React from 'react';
import { Users, Package, UserCog, Stethoscope } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'patients', label: 'Patients', icon: <Users size={24} /> },
    { id: 'resources', label: 'Resources', icon: <Package size={24} /> },
    { id: 'doctors', label: 'Doctors', icon: <Stethoscope size={24} /> },
    { id: 'settings', label: 'Settings', icon: <UserCog size={24} /> },
  ];

  return (
    <div className="bg-white shadow-md">
      <div className="container mx-auto">
        <div className="flex overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center py-4 px-6 border-b-2 transition-colors ${
                activeTab === item.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="mb-1">{item.icon}</div>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Navigation;