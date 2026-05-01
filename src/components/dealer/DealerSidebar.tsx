import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FilePlus, FileText, Shield, LogOut, Menu, X } from 'lucide-react';

const dealerTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dealer-portal/dashboard' },
  { id: 'create-quote', label: 'Create Quote', icon: FilePlus, path: '/dealer-portal/quotes/create' },
  { id: 'quotes', label: 'Quotes', icon: FileText, path: '/dealer-portal/quotes' },
  { id: 'warranties', label: 'Warranties', icon: Shield, path: '/dealer-portal/warranties' },
];

interface DealerSidebarProps {
  onSignOut: () => void;
}

export const DealerSidebar: React.FC<DealerSidebarProps> = ({ onSignOut }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-gray-100 p-2 rounded-lg shadow-md border border-gray-300 text-gray-700"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-white bg-opacity-70 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-[64px] h-[calc(100vh-64px)] w-64 bg-white border-r border-gray-200 z-40 transform transition-transform duration-300 ease-in-out overflow-hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="p-4 lg:p-6 border-b border-gray-200">
          <h2 className="text-lg lg:text-xl font-bold text-gray-900">Dealer Portal</h2>
          <p className="text-sm text-gray-500">Manage your quotes & warranties</p>
        </div>

        <nav className="mt-4 overflow-y-auto h-[calc(100%-160px)] pb-4">
          {dealerTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { navigate(tab.path); setIsOpen(false); }}
              className={`w-full flex items-center px-4 lg:px-6 py-3 text-sm font-medium transition-colors ${
                isActive(tab.path)
                  ? 'bg-orange-100 text-orange-500 border-r-3 border-orange-500'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <tab.icon className="h-5 w-5 mr-3" />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <button
            onClick={onSignOut}
            className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
};
