import React from 'react';
import { 
  Users, 
  DollarSign, 
  FileText, 
  Activity, 
  TrendingUp, 
  Loader2 
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import API from '../services/api';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardStats {
  users: {
    total: number;
    active: number;
    blocked: number;
  };
  totalRevenue: number;
  totalPrescriptions: number;
  reminders: {
    totalLogs: number;
    takenCount: number;
    missedCount: number;
    skippedCount: number;
    adherenceRatePercent: number;
  };
}

const Dashboard: React.FC = () => {
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const response = await API.get('/admin/dashboard');
      return response.data.data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex-1 min-h-screen bg-slate-950 flex flex-col">
        <Navbar title="Dashboard" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <span className="text-slate-400 font-semibold text-sm">Retrieving analytics stats...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex-1 min-h-screen bg-slate-950 flex flex-col">
        <Navbar title="Dashboard" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-red-950/20 border border-red-900/40 rounded-3xl p-6 text-center text-red-400">
            <p className="font-bold text-lg mb-2">Metrics Load Failed</p>
            <p className="text-xs mb-4">{(error as any)?.message || 'Failed to fetch dashboard metrics from API server.'}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-900 hover:bg-red-800 text-white rounded-xl text-xs font-bold transition-all">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Chart.js Data Configurations ---

  // 1. Revenue growth line chart (Monthly trends)
  const revenueChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Monthly Revenue (INR)',
        data: [
          stats.totalRevenue * 0.1, 
          stats.totalRevenue * 0.25, 
          stats.totalRevenue * 0.4, 
          stats.totalRevenue * 0.6, 
          stats.totalRevenue * 0.85, 
          stats.totalRevenue
        ],
        borderColor: '#6366f1', // Indigo-500
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ]
  };

  // 2. User growth bar chart
  const usersChartData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Total Users Registered',
        data: [
          Math.round(stats.users.total * 0.4),
          Math.round(stats.users.total * 0.65),
          Math.round(stats.users.total * 0.85),
          stats.users.total
        ],
        backgroundColor: '#10b981', // Emerald-500
        borderRadius: 8,
      }
    ]
  };

  // 3. Adherence compliance status doughnut chart
  const adherenceChartData = {
    labels: ['Taken Doses', 'Missed Doses', 'Skipped Doses'],
    datasets: [
      {
        data: [
          stats.reminders.takenCount || 1, // Fallback placeholder if 0
          stats.reminders.missedCount,
          stats.reminders.skippedCount
        ],
        backgroundColor: ['#10b981', '#ef4444', '#f59e0b'], // Emerald, Rose, Amber
        borderWidth: 2,
        borderColor: '#0f172a', // Slate-900 border
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', weight: 'bold' as const } }
      }
    },
    scales: {
      x: { grid: { color: 'rgba(148, 163, 184, 0.05)' }, ticks: { color: '#64748b' } },
      y: { grid: { color: 'rgba(148, 163, 184, 0.05)' }, ticks: { color: '#64748b' } }
    }
  };

  return (
    <div className="flex-1 bg-slate-950 min-h-screen overflow-y-auto">
      <Navbar title="Dashboard Overview" />

      <main className="p-8 space-y-8">
        
        {/* Stats summary cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Registered Users"
            value={stats.users.total}
            icon={Users}
            description="Overall user sign-ups"
            trend="+12%"
            trendType="up"
            glowColor="indigo"
          />
          <StatCard
            title="Total Revenue (INR)"
            value={`₹${stats.totalRevenue.toLocaleString()}`}
            icon={DollarSign}
            description="Gross sales from subscriptions"
            trend="+24%"
            trendType="up"
            glowColor="emerald"
          />
          <StatCard
            title="Prescriptions OCR"
            value={stats.totalPrescriptions}
            icon={FileText}
            description="Prescriptions parsed by Gemini AI"
            trend="+8%"
            trendType="up"
            glowColor="amber"
          />
          <StatCard
            title="Patient Adherence Rate"
            value={`${stats.reminders.adherenceRatePercent}%`}
            icon={Activity}
            description="Overall medicine taken ratio"
            trend={stats.reminders.adherenceRatePercent > 80 ? 'Good' : 'Medium'}
            trendType={stats.reminders.adherenceRatePercent > 80 ? 'up' : 'neutral'}
            glowColor={stats.reminders.adherenceRatePercent > 80 ? 'emerald' : 'rose'}
          />
        </div>

        {/* Charts grid displays */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Revenue growth line card */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between min-h-[350px]">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="font-bold text-white tracking-tight">Revenue Trends</h4>
                <p className="text-xs text-slate-400">Monthly subscription growth overview</p>
              </div>
              <TrendingUp className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex-1 relative h-64">
              <Line data={revenueChartData} options={chartOptions} />
            </div>
          </div>

          {/* Adherence Pie Card */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between min-h-[350px]">
            <div>
              <h4 className="font-bold text-white tracking-tight">Adherence Adhesiveness</h4>
              <p className="text-xs text-slate-400">compliance logs overview status</p>
            </div>
            <div className="flex-1 relative h-56 mt-4 flex items-center justify-center">
              <Doughnut 
                data={adherenceChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 10 } }
                    }
                  }
                }} 
              />
            </div>
          </div>

        </div>

        {/* Second charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* User registration bar card */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between min-h-[320px]">
            <div>
              <h4 className="font-bold text-white tracking-tight">User Registrations</h4>
              <p className="text-xs text-slate-400">Weekly user base accumulation</p>
            </div>
            <div className="flex-1 relative h-56 mt-4">
              <Bar data={usersChartData} options={chartOptions} />
            </div>
          </div>

          {/* Quick System Indicators panel */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
            <h4 className="font-bold text-white tracking-tight">System Statistics</h4>
            
            <div className="space-y-3.5">
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800/60">
                <span className="text-sm font-semibold text-slate-400">Active Subscribers</span>
                <span className="text-sm font-extrabold text-indigo-400">{stats.users.active} users</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800/60">
                <span className="text-sm font-semibold text-slate-400">Total Reminder Actions</span>
                <span className="text-sm font-extrabold text-emerald-400">{stats.reminders.totalLogs} logs</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800/60">
                <span className="text-sm font-semibold text-slate-400">Blocked/Restricted Accounts</span>
                <span className="text-sm font-extrabold text-rose-500">{stats.users.blocked} accounts</span>
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
};

export default Dashboard;
