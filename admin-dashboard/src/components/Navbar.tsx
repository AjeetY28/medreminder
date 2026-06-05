import React from 'react';
import { ShieldCheck, Calendar } from 'lucide-react';

interface NavbarProps {
  title: string;
}

const Navbar: React.FC<NavbarProps> = ({ title }) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="h-20 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-8 sticky top-0 z-40">
      {/* Title Page Indicator */}
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-tight">{title}</h2>
        <p className="text-xs text-slate-400 font-medium">MediReminder AI Administrative Portal</p>
      </div>

      {/* Quick info parameters */}
      <div className="flex items-center space-x-6">
        {/* Date display */}
        <div className="flex items-center space-x-2 text-slate-400 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800/80">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold">{currentDate}</span>
        </div>

        {/* Safe server indicators status */}
        <div className="flex items-center space-x-2 text-emerald-400 bg-emerald-950/20 px-4 py-2 rounded-xl border border-emerald-900/40">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider">System Secured</span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
