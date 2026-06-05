import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  trend?: string;
  trendType?: 'up' | 'down' | 'neutral';
  glowColor?: string; // e.g. "indigo", "emerald", "amber"
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  trendType = 'neutral',
  glowColor = 'indigo'
}) => {
  const glowClasses: Record<string, string> = {
    indigo: 'from-indigo-600/10 to-transparent border-indigo-500/20 shadow-indigo-950/20 text-indigo-400 bg-indigo-500/10',
    emerald: 'from-emerald-600/10 to-transparent border-emerald-500/20 shadow-emerald-950/20 text-emerald-400 bg-emerald-500/10',
    amber: 'from-amber-600/10 to-transparent border-amber-500/20 shadow-amber-950/20 text-amber-400 bg-amber-500/10',
    rose: 'from-rose-600/10 to-transparent border-rose-500/20 shadow-rose-950/20 text-rose-400 bg-rose-500/10',
  };

  const selectedGlow = glowClasses[glowColor] || glowClasses.indigo;

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br bg-slate-900 border rounded-2xl p-6 shadow-xl flex flex-col justify-between ${selectedGlow}`}>
      {/* Glow effect backing */}
      <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-current opacity-5 blur-2xl"></div>

      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-3xl font-extrabold text-white tracking-tight">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${selectedGlow.split(' ').pop()}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-800/60 pt-3">
        <span className="text-xs text-slate-400 truncate">{description}</span>
        
        {trend && (
          <span className={`flex items-center space-x-1 text-xs font-bold px-2 py-0.5 rounded-full ${
            trendType === 'up' 
              ? 'bg-emerald-500/10 text-emerald-400' 
              : trendType === 'down' 
                ? 'bg-rose-500/10 text-rose-400' 
                : 'bg-slate-800 text-slate-400'
          }`}>
            {trendType === 'up' && <ArrowUpRight className="w-3.5 h-3.5" />}
            {trendType === 'down' && <ArrowDownRight className="w-3.5 h-3.5" />}
            <span>{trend}</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default StatCard;
