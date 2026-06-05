import React, { useState } from 'react';
import { 
  FileText, 
  ExternalLink, 
  Search, 
  Eye, 
  AlertTriangle, 
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import API from '../services/api';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';

interface ExtractedMedicine {
  medicineName?: string;
  name?: string;
  strength?: string;
  dosage?: string;
  dosagePattern?: string;
  instructions?: string;
  form?: string;
  type?: string;
  frequency: string;
  durationDays?: number;
  duration_days?: number;
  is_duplicate: boolean;
  duplicate_warning: string | null;
}

interface InteractionWarning {
  medicine_a: string;
  medicine_b: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

interface ExtractedData {
  medicines: ExtractedMedicine[];
  interaction_warnings: InteractionWarning[];
}

interface Prescription {
  id: string;
  user_id: string;
  file_url: string;
  extracted_data: ExtractedData;
  created_at: string;
  user_phone: string | null;
  user_email: string | null;
}

const PrescriptionManagement: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // Inspector Modal states
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: prescriptions = [], isLoading, error } = useQuery<Prescription[]>({
    queryKey: ['adminPrescriptions'],
    queryFn: async () => {
      const response = await API.get('/admin/prescriptions');
      return response.data.data;
    }
  });

  const handleOpenInspector = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setIsModalOpen(true);
  };

  const filteredPrescriptions = prescriptions.filter(p => {
    const term = searchQuery.toLowerCase();
    return (
      (p.user_email && p.user_email.toLowerCase().includes(term)) ||
      (p.user_phone && p.user_phone.includes(term)) ||
      p.id.includes(term)
    );
  });

  return (
    <div className="flex-1 bg-slate-950 min-h-screen overflow-y-auto flex flex-col">
      <Navbar title="Prescription OCR & AI Diagnostics" />

      <main className="p-8 flex-1 flex flex-col">
        <div className="glass-card p-6 flex-1 flex flex-col justify-between">
          
          {/* Search Header */}
          <div className="flex justify-between items-center gap-4 mb-6">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by Patient email, phone, or record UUID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition-all text-xs"
              />
            </div>
          </div>

          {/* Table listings */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center py-20 text-slate-400 text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
              <span>{(error as any)?.message || 'Failed to fetch prescription records from the server.'}</span>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Record ID</th>
                    <th className="py-3 px-4">Patient Email / Phone</th>
                    <th className="py-3 px-4">Medicines Found</th>
                    <th className="py-3 px-4">Interactions Severity</th>
                    <th className="py-3 px-4">Upload Date</th>
                    <th className="py-3 px-4 text-center">Inspect Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                  {filteredPrescriptions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-500 text-xs">
                        No prescriptions uploaded for processing.
                      </td>
                    </tr>
                  ) : (
                    filteredPrescriptions.map(p => {
                      const extracted = p.extracted_data || { medicines: [], interaction_warnings: [] };
                      const medCount = extracted.medicines?.length || 0;
                      const hasHighInteraction = extracted.interaction_warnings?.some(w => w.severity === 'HIGH');
                      const hasMedInteraction = extracted.interaction_warnings?.some(w => w.severity === 'MEDIUM');
                      
                      const interactionLabel = hasHighInteraction 
                        ? 'High Alert' 
                        : hasMedInteraction 
                          ? 'Medium Warning' 
                          : 'Clear';

                      const badgeColor = hasHighInteraction 
                        ? 'bg-red-950 text-red-400 border border-red-900/40' 
                        : hasMedInteraction 
                          ? 'bg-amber-950 text-amber-400 border border-amber-900/40' 
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-900/40';

                      return (
                        <tr key={p.id} className="hover:bg-slate-900/20 transition-all">
                          <td className="py-3 px-4 font-mono text-xs text-slate-500">{p.id}</td>
                          <td className="py-3 px-4">
                            <p className="font-semibold">{p.user_email || 'N/A'}</p>
                            <p className="text-xs text-slate-500 font-medium">{p.user_phone || ''}</p>
                          </td>
                          <td className="py-3 px-4 text-xs font-bold text-white">
                            {medCount} drugs detected
                          </td>
                          <td className="py-3 px-4 text-xs">
                            <span className={`px-2 py-0.5 rounded-full font-bold ${badgeColor}`}>
                              {interactionLabel}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-400">
                            {new Date(p.created_at).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center space-x-3">
                              {/* Inspect visual UI */}
                              <button
                                onClick={() => handleOpenInspector(p)}
                                className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-950 text-indigo-400 hover:bg-indigo-900 hover:text-white rounded-lg text-xs font-bold transition-all border border-indigo-900/30"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect AI OCR</span>
                              </button>
                              
                              {/* Link to file */}
                              <a
                                href={p.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-all"
                                title="Open Source File"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </main>

      {/* OCR Diagnostics Modal Inspector */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Gemini AI Diagnostic Inspector"
        size="lg"
      >
        {selectedPrescription && (
          <div className="space-y-6 text-sm text-slate-300">
            
            {/* Details headers */}
            <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
              <div className="flex items-center space-x-3">
                <FileText className="w-8 h-8 text-indigo-400" />
                <div>
                  <h5 className="font-bold text-white">Prescription File Overview</h5>
                  <p className="text-xs text-slate-500 font-mono">Record ID: {selectedPrescription.id}</p>
                </div>
              </div>
              <a 
                href={selectedPrescription.file_url} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                <span>View Raw File</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* TAB 1: Extracted Medicines */}
            <div className="space-y-3">
              <h6 className="font-bold text-white border-b border-slate-800 pb-2">1. Extracted Medicines List</h6>
              
              {(!selectedPrescription.extracted_data || !selectedPrescription.extracted_data.medicines || selectedPrescription.extracted_data.medicines.length === 0) ? (
                <p className="text-slate-500 text-xs">No medicines extracted by the OCR system.</p>
              ) : (
                <div className="space-y-3">
                  {selectedPrescription.extracted_data.medicines.map((med, index) => (
                    <div key={index} className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl relative overflow-hidden">
                      {med.is_duplicate && (
                        <div className="absolute top-0 right-0 bg-red-950 text-red-400 text-[10px] font-extrabold px-2 py-0.5 rounded-bl border-l border-b border-red-900/30 uppercase tracking-wide">
                          Therapy Conflict
                        </div>
                      )}
                      
                      <div className="flex items-baseline space-x-2 mb-1.5">
                        <span className="text-sm font-bold text-white">{med.medicineName || med.name}</span>
                        <span className="text-xs text-slate-500 font-medium">({med.form || med.type || 'Generic'})</span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-400">
                        <div>
                          <span className="text-slate-600 block">Dosage</span>
                          <span className="font-semibold text-slate-300">{med.strength || med.dosage || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 block">Frequency</span>
                          <span className="font-semibold text-slate-300">{med.frequency || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 block">Instructions</span>
                          <span className="font-semibold text-slate-300 truncate block max-w-[120px]">{med.dosagePattern || med.instructions || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 block">Course Duration</span>
                          <span className="font-semibold text-slate-300">
                            {med.durationDays !== undefined ? `${med.durationDays} days` : med.duration_days ? `${med.duration_days} days` : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {med.is_duplicate && med.duplicate_warning && (
                        <div className="mt-2.5 p-2 bg-red-950/20 border border-red-900/20 text-red-400 text-xs rounded-lg flex items-start space-x-1.5">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>{med.duplicate_warning}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TAB 2: Interaction Warnings */}
            <div className="space-y-3">
              <h6 className="font-bold text-white border-b border-slate-800 pb-2">2. Clinical Safety Reviews</h6>
              
              {(!selectedPrescription.extracted_data || !selectedPrescription.extracted_data.interaction_warnings || selectedPrescription.extracted_data.interaction_warnings.length === 0) ? (
                <div className="p-3.5 bg-emerald-950/10 border border-emerald-900/30 text-emerald-400 text-xs rounded-xl flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">No drug interactions or clinical anomalies detected in this prescription.</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedPrescription.extracted_data.interaction_warnings.map((warn, index) => {
                    const sevColor = warn.severity === 'HIGH' 
                      ? 'text-red-400 bg-red-950/25 border-red-900/40' 
                      : warn.severity === 'MEDIUM'
                        ? 'text-amber-400 bg-amber-950/25 border-amber-900/40'
                        : 'text-slate-400 bg-slate-800/45 border-slate-800';

                    return (
                      <div key={index} className={`p-3.5 border rounded-xl flex items-start space-x-3 ${sevColor}`}>
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-current" />
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-bold text-white">{warn.medicine_a}</span>
                            <span className="text-slate-500 font-bold">⇌</span>
                            <span className="font-bold text-white">{warn.medicine_b}</span>
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider bg-black/40">
                              {warn.severity}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">{warn.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all text-xs"
              >
                Close Diagnostic View
              </button>
            </div>

          </div>
        )}
      </Modal>
    </div>
  );
};

export default PrescriptionManagement;
