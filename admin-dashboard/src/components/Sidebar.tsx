import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Pill, 
  FileText, 
  CreditCard, 
  Bell, 
  Sliders, 
  Settings as SettingsIcon,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar: React.FC = () => {
  const { logout, user } = useAuth();

  const navigationItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Users', path: '/users', icon: Users },
    { name: 'Medicines & Logs', path: '/medicines', icon: Pill },
    { name: 'Prescriptions', path: '/prescriptions', icon: FileText },
    { name: 'Payments', path: '/payments', icon: CreditCard },
    { name: 'Notifications', path: '/notifications', icon: Bell },
    { name: 'Pricing & Plans', path: '/pricing', icon: Sliders },
    { name: 'App Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0">
      {/* Logo Branding Header */}
      <div className="h-20 flex items-center px-6 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <span className="text-white font-extrabold text-xl">M</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">MediReminder</h1>
            <span className="text-xs text-indigo-400 font-semibold tracking-wider uppercase">Admin AI</span>
          </div>
        </div>
      </div>

      {/* Navigation Link List */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navigationItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => `
              flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200
              ${isActive 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'}
            `}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logged User Profile Footer */}
      <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-900/50">
        <div className="flex items-center space-x-3 px-2">
          <div className="w-9 h-9 rounded-full bg-indigo-900 flex items-center justify-center text-indigo-300 font-bold border border-indigo-700">
            {user?.email?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Administrator</p>
            <p className="text-sm font-bold text-slate-100 truncate">{user?.email || 'admin@medireminder.ai'}</p>
          </div>
        </div>
        
        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 px-4 py-2.5 text-slate-400 hover:bg-red-950/20 hover:text-red-400 rounded-xl text-sm font-semibold transition-all"
        >
          <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-400" />
          <span>Logout Session</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
