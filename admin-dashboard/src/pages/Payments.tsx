import React, { useState } from 'react';
import { 
  Search, 
  Download, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import API from '../services/api';
import Navbar from '../components/Navbar';

interface Payment {
  id: string;
  user_id: string;
  order_id: string;
  transaction_id: string | null;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  created_at: string;
  user_phone: string | null;
  user_email: string | null;
}

const Payments: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // States for report downloader section
  const [targetUserId, setTargetUserId] = useState('');
  const [isDownloadingCSV, setIsDownloadingCSV] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

  const PAYMENTS_PER_PAGE = 50;

  const { data: paymentsData, isLoading, error } = useQuery<{ total: number; data: Payment[] }>({
    queryKey: ['adminPayments', currentPage],
    queryFn: async () => {
      const offset = (currentPage - 1) * PAYMENTS_PER_PAGE;
      const response = await API.get(`/admin/payments?limit=${PAYMENTS_PER_PAGE}&offset=${offset}`);
      return response.data.data;
    }
  });

  const payments = paymentsData?.data || [];
  const totalPayments = paymentsData?.total || 0;
  const totalPages = Math.ceil(totalPayments / PAYMENTS_PER_PAGE);

  const handleDownloadReport = async (format: 'csv' | 'excel') => {
    if (!targetUserId.trim()) {
      alert('Please provide a target User UUID to compile the report.');
      return;
    }

    if (format === 'csv') {
      setIsDownloadingCSV(true);
    } else {
      setIsDownloadingExcel(true);
    }

    try {
      const response = await API.get(`/admin/reports/${format}?userId=${targetUserId.trim()}`, {
        responseType: 'blob'
      });

      const blobType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const fileExtension = format === 'csv' ? 'csv' : 'xlsx';

      const fileBlob = new Blob([response.data], { type: blobType });
      const downloadUrl = window.URL.createObjectURL(fileBlob);
      
      const linkElement = document.createElement('a');
      linkElement.href = downloadUrl;
      linkElement.setAttribute('download', `adherence_report_${targetUserId.trim()}_${Date.now()}.${fileExtension}`);
      
      document.body.appendChild(linkElement);
      linkElement.click();
      linkElement.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error(err);
      alert(`Failed to compile and download ${format.toUpperCase()} report. Ensure the User UUID exists.`);
    } finally {
      setIsDownloadingCSV(false);
      setIsDownloadingExcel(false);
    }
  };

  // Filter listings
  const filteredPayments = payments.filter(p => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = 
      p.order_id.toLowerCase().includes(term) ||
      (p.transaction_id && p.transaction_id.toLowerCase().includes(term)) ||
      (p.user_email && p.user_email.toLowerCase().includes(term)) ||
      (p.user_phone && p.user_phone.includes(term));
      
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 bg-slate-950 min-h-screen overflow-y-auto flex flex-col">
      <Navbar title="Payments & Revenue Reports" />

      <main className="p-8 space-y-8 flex-1 flex flex-col">
        
        {/* Reports Compilation Section */}
        <div className="glass-card p-6">
          <h4 className="font-bold text-white mb-2 tracking-tight">Generate Patient Adherence Spreadsheets</h4>
          <p className="text-xs text-slate-400 mb-4">Input a patient's UUID to export styled CSV or Excel logs showing their medicine taken history.</p>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <input
              type="text"
              placeholder="Enter Patient User UUID (e.g. 74df49bc-...)"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="flex-1 max-w-md px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition-all text-xs"
            />
            
            <div className="flex space-x-2">
              <button
                onClick={() => handleDownloadReport('csv')}
                disabled={isDownloadingCSV || isDownloadingExcel}
                className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                {isDownloadingCSV ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Compiling...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => handleDownloadReport('excel')}
                disabled={isDownloadingCSV || isDownloadingExcel}
                className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {isDownloadingExcel ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Compiling...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Excel</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Payments list card */}
        <div className="glass-card p-6 flex-1 flex flex-col justify-between">
          
          {/* Filters */}
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 mb-6 border-b border-slate-800/80 pb-5">
            <div className="flex space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800/60 max-w-md">
              {['ALL', 'SUCCESS', 'PENDING', 'FAILED'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold transition-all uppercase tracking-wide ${
                    statusFilter === status 
                      ? 'bg-indigo-600 text-white shadow' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="relative max-w-sm w-full font-sans">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by Order ID, Txn ID, or Email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition-all text-xs"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center py-20 text-slate-400 text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
              <span>{(error as any)?.message || 'Failed to retrieve payment records from the server.'}</span>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Patient Email / Phone</th>
                    <th className="py-3 px-4">Gateway Txn ID</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Transaction Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-500 text-xs">
                        No transaction records found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map(p => {
                      const isSuccess = p.status === 'SUCCESS';
                      const isFailed = p.status === 'FAILED';
                      const StatusIcon = isSuccess ? CheckCircle2 : isFailed ? XCircle : Clock;
                      
                      const badgeColor = isSuccess 
                        ? 'bg-emerald-950 text-emerald-400' 
                        : isFailed 
                          ? 'bg-rose-950 text-rose-400' 
                          : 'bg-amber-950 text-amber-400';

                      return (
                        <tr key={p.id} className="hover:bg-slate-900/20 transition-all">
                          <td className="py-3 px-4 font-mono text-xs text-slate-400">{p.order_id}</td>
                          <td className="py-3 px-4">
                            <p className="font-semibold">{p.user_email || 'N/A'}</p>
                            <p className="text-xs text-slate-500 font-medium">{p.user_phone || ''}</p>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-500">
                            {p.transaction_id || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-xs font-bold text-white">
                            ₹{Number(p.amount).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-xs">
                            <span className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full font-bold w-fit ${badgeColor}`}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              <span>{p.status}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-400">
                            {new Date(p.created_at).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center border-t border-slate-800/80 pt-4 mt-6">
              <span className="text-xs text-slate-500">
                Showing Page {currentPage} of {totalPages} ({totalPayments} total transactions)
              </span>
              <div className="flex items-center space-x-2">
                <button
                  disabled={currentPage === 1 || isLoading}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentPage === totalPages || isLoading}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default Payments;
