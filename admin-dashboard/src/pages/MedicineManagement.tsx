import React, { useState } from 'react';
import { 
  Pill, 
  Activity, 
  Search, 
  Loader2, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import API from '../services/api';
import Navbar from '../components/Navbar';

interface Medicine {
  id: string;
  user_id: string;
  medicineName?: string;
  name?: string;
  strength?: string | null;
  dosage?: string | null;
  dosagePattern?: string | null;
  instructions?: string | null;
  form?: string | null;
  type?: string | null;
  stock: number;
  unit: string | null;
  expiry_date: string | null;
  created_at: string;
  user_phone: string | null;
  user_email: string | null;
}

interface IntakeLog {
  id: string;
  reminder_schedule_id: string | null;
  medicine_id: string;
  user_id: string;
  status: 'TAKEN' | 'MISSED' | 'SKIPPED';
  logged_at: string;
  medicine_name: string;
  medicine_dosage: string | null;
  user_phone: string | null;
  user_email: string | null;
}

const MedicineManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'medicines' | 'logs'>('medicines');
  const [searchQuery, setSearchQuery] = useState('');
  const [medPage, setMedPage] = useState(1);
  const [logPage, setLogPage] = useState(1);

  const ITEMS_PER_PAGE = 50;

  const { data: medsData, isLoading: isLoadingMeds, error: errorMeds } = useQuery<{ total: number; data: Medicine[] }>({
    queryKey: ['adminMedicines', medPage],
    queryFn: async () => {
      const offset = (medPage - 1) * ITEMS_PER_PAGE;
      const response = await API.get(`/admin/medicines?limit=${ITEMS_PER_PAGE}&offset=${offset}`);
      return response.data.data;
    }
  });

  const { data: logsData, isLoading: isLoadingLogs, error: errorLogs } = useQuery<{ total: number; data: IntakeLog[] }>({
    queryKey: ['adminLogs', logPage],
    queryFn: async () => {
      const offset = (logPage - 1) * ITEMS_PER_PAGE;
      const response = await API.get(`/admin/logs?limit=${ITEMS_PER_PAGE}&offset=${offset}`);
      return response.data.data;
    }
  });

  const medicines = medsData?.data || [];
  const totalMedicines = medsData?.total || 0;
  const logs = logsData?.data || [];
  const totalLogs = logsData?.total || 0;

  const isLoading = activeTab === 'medicines' ? isLoadingMeds : isLoadingLogs;
  const error = activeTab === 'medicines' ? errorMeds : errorLogs;

  // Filter lists based on local search term
  const filteredMedicines = medicines.filter(m => {
    const term = searchQuery.toLowerCase();
    const nameVal = m.medicineName || m.name || '';
    return (
      nameVal.toLowerCase().includes(term) ||
      (m.user_email && m.user_email.toLowerCase().includes(term)) ||
      (m.user_phone && m.user_phone.includes(term))
    );
  });

  const filteredLogs = logs.filter(l => {
    const term = searchQuery.toLowerCase();
    return (
      l.medicine_name.toLowerCase().includes(term) ||
      (l.user_email && l.user_email.toLowerCase().includes(term)) ||
      (l.user_phone && l.user_phone.includes(term)) ||
      l.status.toLowerCase() === term
    );
  });

  return (
    <div className="flex-1 bg-slate-950 min-h-screen overflow-y-auto flex flex-col">
      <Navbar title="Medicines Database & Compliance Logs" />

      <main className="p-8 flex-1 flex flex-col">
        <div className="glass-card p-6 flex-1 flex flex-col justify-between">
          
          {/* Tabs Selection Header & Search */}
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 mb-6 border-b border-slate-800/80 pb-5">
            <div className="flex space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800/60 max-w-sm">
              <button
                onClick={() => { setActiveTab('medicines'); setSearchQuery(''); }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'medicines' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Pill className="w-3.5 h-3.5" />
                <span>Medicines Database</span>
              </button>
              <button
                onClick={() => { setActiveTab('logs'); setSearchQuery(''); }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'logs' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Compliance Logs</span>
              </button>
            </div>

            {/* Search Field */}
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder={activeTab === 'medicines' ? "Search by Drug name or Patient email..." : "Search by Drug, Patient email, or status..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition-all text-xs"
              />
            </div>
          </div>

          {/* Loading/Error content */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center py-20 text-slate-400 text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
              <span>{(error as any)?.message || 'Failed to fetch database entries.'}</span>
            </div>
          ) : activeTab === 'medicines' ? (
            <div className="flex-1 overflow-x-auto">
              {/* Table: Medicines Database */}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Patient Email / Phone</th>
                    <th className="py-3 px-4">Medicine Name</th>
                    <th className="py-3 px-4">Dosage</th>
                    <th className="py-3 px-4">Instructions</th>
                    <th className="py-3 px-4">Drug Type</th>
                    <th className="py-3 px-4">Stock Level</th>
                    <th className="py-3 px-4">Expiry Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                  {filteredMedicines.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-500 text-xs">
                        No active medicines registered in the database.
                      </td>
                    </tr>
                  ) : (
                    filteredMedicines.map(med => (
                      <tr key={med.id} className="hover:bg-slate-900/20 transition-all">
                        <td className="py-3 px-4">
                          <p className="font-semibold">{med.user_email || 'N/A'}</p>
                          <p className="text-xs text-slate-500 font-medium">{med.user_phone || ''}</p>
                        </td>
                        <td className="py-3 px-4 font-bold text-white">{med.medicineName || med.name}</td>
                        <td className="py-3 px-4 text-xs font-semibold text-slate-400">{med.strength || med.dosage || 'N/A'}</td>
                        <td className="py-3 px-4 text-xs max-w-xs truncate text-slate-400" title={med.dosagePattern || med.instructions || ''}>
                          {med.dosagePattern || med.instructions || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                            {med.form || med.type || 'Generic'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <span className={`font-bold ${med.stock < 5 ? 'text-red-400' : 'text-slate-300'}`}>
                            {med.stock} {med.unit || 'pieces'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400">
                          {med.expiry_date ? new Date(med.expiry_date).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          ) : (
            <div className="flex-1 overflow-x-auto">
              {/* Table: Compliance Intake Logs */}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Patient Email / Phone</th>
                    <th className="py-3 px-4">Medicine Name</th>
                    <th className="py-3 px-4">Dosage</th>
                    <th className="py-3 px-4">Status State</th>
                    <th className="py-3 px-4">Logged Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-500 text-xs">
                        No medicine logs recorded recently.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-900/20 transition-all">
                        <td className="py-3 px-4">
                          <p className="font-semibold">{log.user_email || 'N/A'}</p>
                          <p className="text-xs text-slate-500 font-medium">{log.user_phone || ''}</p>
                        </td>
                        <td className="py-3 px-4 font-bold text-white">{log.medicine_name}</td>
                        <td className="py-3 px-4 text-xs text-slate-400">{log.medicine_dosage || 'N/A'}</td>
                        <td className="py-3 px-4 text-xs">
                          <span className={`px-2 py-0.5 rounded-full font-bold ${
                            log.status === 'TAKEN' 
                              ? 'bg-emerald-950 text-emerald-400' 
                              : log.status === 'MISSED'
                                ? 'bg-red-950 text-red-400'
                                : 'bg-amber-950 text-amber-400'
                          }`}>{log.status}</span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400">
                          {new Date(log.logged_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          )}

          {/* Pagination Footer */}
          {(() => {
            const total = activeTab === 'medicines' ? totalMedicines : totalLogs;
            const currentPage = activeTab === 'medicines' ? medPage : logPage;
            const setPage = activeTab === 'medicines' ? setMedPage : setLogPage;
            const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

            if (totalPages <= 1) return null;

            return (
              <div className="flex justify-between items-center border-t border-slate-800/80 pt-4 mt-6">
                <span className="text-xs text-slate-500">
                  Showing Page {currentPage} of {totalPages} ({total} total records)
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={currentPage === 1 || isLoading}
                    onClick={() => setPage(prev => prev - 1)}
                    className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={currentPage === totalPages || isLoading}
                    onClick={() => setPage(prev => prev + 1)}
                    className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })()}

        </div>
      </main>
    </div>
  );
};

export default MedicineManagement;
