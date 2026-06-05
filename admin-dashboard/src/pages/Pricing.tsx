import React, { useState, useEffect } from 'react';
import { Sliders, DollarSign, CheckCircle2, ShieldAlert, Loader2 } from 'lucide-react';
import API from '../services/api';
import Navbar from '../components/Navbar';

interface SettingItem {
  key: string;
  value: string;
  description: string;
}

const Pricing: React.FC = () => {
  const [dailyRate, setDailyRate] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [annualPrice, setAnnualPrice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchPricingSettings = async () => {
      try {
        const response = await API.get('/admin/settings');
        const settingsList: SettingItem[] = response.data.data;
        
        const daily = settingsList.find(s => s.key === 'price_per_day');
        if (daily) setDailyRate(daily.value);

        const sub = settingsList.find(s => s.key === 'pricing_subscription');
        if (sub) {
          const parsed = JSON.parse(sub.value);
          setMonthlyPrice(parsed.monthly);
          setAnnualPrice(parsed.annual);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
        setErrorMsg('Failed to load pricing values from settings.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPricingSettings();
  }, []);

  const handleUpdatePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    setIsSaving(true);

    try {
      // 1. Update daily rate
      await API.put('/admin/settings', {
        key: 'price_per_day',
        value: dailyRate,
        description: 'Standard daily subscription fee in INR'
      });

      // 2. Update subscription plans JSON
      const updatedSubJson = JSON.stringify({
        monthly: parseFloat(monthlyPrice),
        annual: parseFloat(annualPrice)
      });

      await API.put('/admin/settings', {
        key: 'pricing_subscription',
        value: updatedSubJson,
        description: 'JSON structure of standard plans'
      });

      setSuccessMsg('Pricing parameters updated successfully in database settings.');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to update pricing properties.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 min-h-screen overflow-y-auto flex flex-col">
      <Navbar title="Pricing & Subscription Plans" />

      <main className="p-8 space-y-8 flex-1 max-w-2xl">
        <div className="glass-card p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white tracking-tight">Billing Configuration</h4>
              <p className="text-xs text-slate-400">Modify global application rates and subscription plans in INR</p>
            </div>
          </div>

          {isLoading ? (
            <div className="py-10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleUpdatePricing} className="space-y-6">
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

              {/* Daily Rate */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Standard Daily Fee (INR)</label>
                <div className="relative max-w-xs">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={dailyRate}
                    onChange={(e) => setDailyRate(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition-all text-xs"
                  />
                </div>
                <span className="text-[10px] text-slate-500">Charged on an ad-hoc basis for individual medicine schedule tracking.</span>
              </div>

              <div className="border-t border-slate-800/80 my-5 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Monthly Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Monthly Plan Cost</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={monthlyPrice}
                      onChange={(e) => setMonthlyPrice(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition-all text-xs"
                    />
                  </div>
                </div>

                {/* Annual Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Annual Plan Cost</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={annualPrice}
                      onChange={(e) => setAnnualPrice(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition-all text-xs"
                    />
                  </div>
                </div>

              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center space-x-2 text-xs disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Prices...</span>
                  </>
                ) : (
                  <>
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Apply Price Plan Changes</span>
                  </>
                )}
              </button>
            </form>
          )}

        </div>
      </main>
    </div>
  );
};

export default Pricing;
