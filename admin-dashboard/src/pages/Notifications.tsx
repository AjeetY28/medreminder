import React, { useState } from 'react';
import { Send, Users, User, ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react';
import API from '../services/api';
import Navbar from '../components/Navbar';

const Notifications: React.FC = () => {
  // Broadcast Notification Form
  const [bTitle, setBTitle] = useState('');
  const [bBody, setBBody] = useState('');
  const [bConfirm, setBConfirm] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [bSuccessMsg, setBSuccessMsg] = useState<string | null>(null);
  const [bErrorMsg, setBErrorMsg] = useState<string | null>(null);

  // Custom Direct Notification Form
  const [cUserId, setCUserId] = useState('');
  const [cTitle, setCTitle] = useState('');
  const [cBody, setCBody] = useState('');
  const [isSendingCustom, setIsSendingCustom] = useState(false);
  const [cSuccessMsg, setCSuccessMsg] = useState<string | null>(null);
  const [cErrorMsg, setCErrorMsg] = useState<string | null>(null);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setBSuccessMsg(null);
    setBErrorMsg(null);

    if (!bConfirm) {
      alert('Please confirm the broadcast safety check first.');
      return;
    }

    setIsBroadcasting(true);

    try {
      const response = await API.post('/admin/notifications/broadcast', {
        title: bTitle,
        body: bBody
      });
      setBSuccessMsg(response.data.message || 'Broadcast completed successfully!');
      setBTitle('');
      setBBody('');
      setBConfirm(false);
    } catch (err: any) {
      console.error(err);
      setBErrorMsg(err.response?.data?.message || 'Failed to dispatch broadcast push.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleSendCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCSuccessMsg(null);
    setCErrorMsg(null);

    setIsSendingCustom(true);

    try {
      const response = await API.post('/admin/notifications/custom', {
        userId: cUserId.trim(),
        title: cTitle,
        body: cBody
      });
      setCSuccessMsg(response.data.message || 'Push alert sent successfully!');
      setCUserId('');
      setCTitle('');
      setCBody('');
    } catch (err: any) {
      console.error(err);
      setCErrorMsg(err.response?.data?.message || 'Failed to dispatch direct push notification.');
    } finally {
      setIsSendingCustom(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 min-h-screen overflow-y-auto flex flex-col">
      <Navbar title="Push Notification Dispatches" />

      <main className="p-8 space-y-8 flex-1">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Column 1: Broadcast Notification Form */}
          <div className="glass-card p-6 border-indigo-500/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white tracking-tight">System-Wide Broadcast</h4>
                  <p className="text-xs text-slate-400">Sends standard system push notifications to ALL registered devices</p>
                </div>
              </div>

              <form onSubmit={handleBroadcast} className="space-y-4 mt-6">
                {bSuccessMsg && (
                  <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-xl flex items-start space-x-3 text-emerald-400 text-xs">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span className="font-semibold">{bSuccessMsg}</span>
                  </div>
                )}
                {bErrorMsg && (
                  <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-xl flex items-start space-x-3 text-red-400 text-xs">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                    <span className="font-semibold">{bErrorMsg}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Notification Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Scheduled App Maintenance Tonight"
                    value={bTitle}
                    onChange={(e) => setBTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition-all text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alert Body Content</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="e.g. MediReminder AI will undergo scheduled maintenance tonight at 02:00 AM. Thank you for your cooperation."
                    value={bBody}
                    onChange={(e) => setBBody(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition-all text-xs"
                  />
                </div>

                {/* Safety Confirmation */}
                <label className="flex items-start space-x-2.5 p-3.5 bg-indigo-950/20 border border-indigo-900/20 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bConfirm}
                    onChange={(e) => setBConfirm(e.target.checked)}
                    className="mt-0.5 rounded border-slate-800 text-indigo-600 focus:ring-indigo-600 focus:ring-offset-slate-900 bg-slate-950"
                  />
                  <span className="text-[11px] font-semibold text-slate-400 leading-normal">
                    I verify that this push alert is intended for all patients and has been audited for typos.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isBroadcasting || !bConfirm}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 text-xs disabled:opacity-50"
                >
                  {isBroadcasting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Broadcasting Push...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch Broadcast</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Column 2: Custom Notification Form */}
          <div className="glass-card p-6 border-amber-500/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white tracking-tight">Direct Client Notification</h4>
                  <p className="text-xs text-slate-400">Sends a direct push alert to a specific client account using their User UUID</p>
                </div>
              </div>

              <form onSubmit={handleSendCustom} className="space-y-4 mt-6">
                {cSuccessMsg && (
                  <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-xl flex items-start space-x-3 text-emerald-400 text-xs">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span className="font-semibold">{cSuccessMsg}</span>
                  </div>
                )}
                {cErrorMsg && (
                  <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-xl flex items-start space-x-3 text-red-400 text-xs">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                    <span className="font-semibold">{cErrorMsg}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patient User UUID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 74df49bc-4a49-4fcf-8472-..."
                    value={cUserId}
                    onChange={(e) => setCUserId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition-all text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Notification Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Refill Reminder alert"
                    value={cTitle}
                    onChange={(e) => setCTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition-all text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alert Body Content</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="e.g. Your Amoxicillin course is running low on stock (only 3 capsules remaining). Please refill your prescription."
                    value={cBody}
                    onChange={(e) => setCBody(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition-all text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingCustom}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-600/20 flex items-center justify-center space-x-2 text-xs"
                >
                  {isSendingCustom ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Alert...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch Direct Alert</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
};

export default Notifications;
