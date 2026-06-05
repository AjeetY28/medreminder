import React, { useState, useEffect } from 'react';
import { Sliders, ToggleLeft, ToggleRight, CheckCircle2, ShieldAlert, Loader2, AlertTriangle } from 'lucide-react';
import API from '../services/api';
import Navbar from '../components/Navbar';

interface SettingItem {
  key: string;
  value: string;
  description: string;
}

const Settings: React.FC = () => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  
  // Feature Flags
  const [aiOcrActive, setAiOcrActive] = useState(true);
  const [paymentsActive, setPaymentsActive] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await API.get('/admin/settings');
        const settingsList: SettingItem[] = response.data.data;
        
        const mMode = settingsList.find(s => s.key === 'maintenance_mode');
        if (mMode) setMaintenanceMode(mMode.value === 'true');

        const version = settingsList.find(s => s.key === 'app_version');
        if (version) setAppVersion(version.value);

        // Feature flags loading simulation (or load from database key if present)
        const flags = settingsList.find(s => s.key === 'feature_flags');
        if (flags) {
          const parsed = JSON.parse(flags.value);
          setAiOcrActive(parsed.ai_ocr);
          setPaymentsActive(parsed.payments);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
        setErrorMsg('Failed to load system config properties.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    setIsSaving(true);

    try {
      // 1. Save Maintenance Mode
      await API.put('/admin/settings', {
        key: 'maintenance_mode',
        value: String(maintenanceMode),
        description: 'Enable/disable app-wide maintenance mode'
      });

      // 2. Save App Version
      await API.put('/admin/settings', {
        key: 'app_version',
        value: appVersion,
        description: 'Minimum supported application version'
      });

      // 3. Save Feature Flags
      const flagsValue = JSON.stringify({
        ai_ocr: aiOcrActive,
        payments: paymentsActive
      });
      await API.put('/admin/settings', {
        key: 'feature_flags',
        value: flagsValue,
        description: 'JSON list of feature flags'
      });

      setSuccessMsg('System configuration settings saved successfully.');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to save settings to the database.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 min-h-screen overflow-y-auto flex flex-col">
      <Navbar title="App Settings & Feature Flags" />

      <main className="p-8 space-y-8 flex-1 max-w-2xl">
        <div className="glass-card p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white tracking-tight">System Controls</h4>
              <p className="text-xs text-slate-400">Toggle operational modes, minimum API versions, and experimental parameters</p>
            </div>
          </div>

          {isLoading ? (
            <div className="py-10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              {successMsg && (
                <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-xl flex items-start space-x-3 text-emerald-400 text-xs">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span className="font-semibold">{successMsg}</span>
                </div>
              )}
              {errorMsg && (
                <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-xl flex items-start space-x-3 text-red-400 text-xs">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                  <span className="font-semibold">{errorMsg}</span>
                </div>
              )}

              {/* Maintenance Mode Toggle */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <h5 className="text-sm font-bold text-white mb-0.5">App-wide Maintenance Mode</h5>
                  <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                    When active, client mobile applications will block user requests and display a maintenance screen.
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={() => setMaintenanceMode(prev => !prev)}
                  className="focus:outline-none transition-all text-slate-400 hover:text-white"
                >
                  {maintenanceMode ? (
                    <ToggleRight className="w-12 h-12 text-rose-500" />
                  ) : (
                    <ToggleLeft className="w-12 h-12 text-slate-600" />
                  )}
                </button>
              </div>

              {maintenanceMode && (
                <div className="p-4 bg-rose-950/25 border border-rose-900/35 rounded-xl flex items-start space-x-2.5 text-rose-400 text-xs">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
                  <div>
                    <span className="font-bold">Caution Alert</span>
                    <p className="text-[11px] mt-0.5 text-slate-300">Enabling maintenance mode impacts all patients currently using the application. Ensure you only turn this on during updates.</p>
                  </div>
                </div>
              )}

              {/* App Version */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Minimum App Version Required</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1.0.0"
                  value={appVersion}
                  onChange={(e) => setAppVersion(e.target.value)}
                  className="max-w-xs w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition-all text-xs font-mono"
                />
                <span className="text-[10px] text-slate-500 block">Forces older mobile builds to navigate users to update.</span>
              </div>

              {/* Feature Flags Section */}
              <div className="space-y-3.5 border-t border-slate-800/80 pt-5 my-5">
                <h6 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Feature Flags</h6>
                
                <div className="space-y-3">
                  {/* AI OCR */}
                  <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800/60">
                    <div>
                      <span className="text-xs font-bold text-white block">Gemini AI OCR Processing</span>
                      <span className="text-[10px] text-slate-500">Enables prescription image scanning using Gemini Pro models.</span>
                    </div>
                    <button type="button" onClick={() => setAiOcrActive(prev => !prev)}>
                      {aiOcrActive ? (
                        <ToggleRight className="w-9 h-9 text-indigo-500" />
                      ) : (
                        <ToggleLeft className="w-9 h-9 text-slate-700" />
                      )}
                    </button>
                  </div>

                  {/* PayU */}
                  <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800/60">
                    <div>
                      <span className="text-xs font-bold text-white block">PayU Payment Checkouts</span>
                      <span className="text-[10px] text-slate-500">Allows users to purchase standard billing plans and renewals.</span>
                    </div>
                    <button type="button" onClick={() => setPaymentsActive(prev => !prev)}>
                      {paymentsActive ? (
                        <ToggleRight className="w-9 h-9 text-indigo-500" />
                      ) : (
                        <ToggleLeft className="w-9 h-9 text-slate-700" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 text-xs"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving configurations...</span>
                  </>
                ) : (
                  <span>Save Parameters Configuration</span>
                )}
              </button>

            </form>
          )}

        </div>
      </main>
    </div>
  );
};

export default Settings;
