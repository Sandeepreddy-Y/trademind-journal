'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTrades } from '../../context/TradeContext';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/ui/Card';
import { 
  Settings as SettingsIcon, 
  Save, 
  Trash2, 
  Plus, 
  Layers, 
  ShieldCheck, 
  Globe, 
  DollarSign,
  User,
  LogOut,
  FolderSync
} from 'lucide-react';

export default function Settings() {
  const { user, logout, loading: authLoading } = useAuth();
  const { settings, updateSettings, loading: tradesLoading } = useTrades();
  const router = useRouter();

  // Core settings form state
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('GMT-5');
  const [riskLimit, setRiskLimit] = useState<number>(2.0);
  const [defaultLotSize, setDefaultLotSize] = useState<number>(0.1);
  const [checklist, setChecklist] = useState<string[]>([]);
  
  // Custom checklist item input state
  const [newItem, setNewItem] = useState('');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load context settings
  useEffect(() => {
    if (settings) {
      setCurrency(settings.currency || 'USD');
      setTimezone(settings.timezone || 'GMT-5');
      setRiskLimit(settings.riskLimit || 2.0);
      setDefaultLotSize(settings.defaultLotSize || 0.1);
      setChecklist(settings.tradingChecklist || []);
    }
  }, [settings]);

  if (authLoading || tradesLoading || !user) {
    return (
      <div className="min-h-screen bg-[#06070a] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest animate-pulse">Syncing Settings...</p>
      </div>
    );
  }

  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    setChecklist(prev => [...prev, newItem.trim()]);
    setNewItem('');
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklist(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSuccessMsg('');

    try {
      const mergedSettings = settings 
        ? {
            ...settings,
            currency,
            timezone,
            riskLimit: Number(riskLimit),
            defaultLotSize: Number(defaultLotSize),
            tradingChecklist: checklist
          }
        : {
            currency,
            timezone,
            defaultRiskPct: 1,
            theme: 'dark' as const,
            weeklyTarget: 500,
            monthlyTarget: 2000,
            riskRules: '',
            riskLimit: Number(riskLimit),
            defaultLotSize: Number(defaultLotSize),
            tradingChecklist: checklist
          };

      await updateSettings(mergedSettings);
      setSuccessMsg('Parameters saved and synced successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#07080c] text-slate-100 pl-0 md:pl-64">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Container */}
      <main className="flex-1 px-6 py-8 mt-16 md:mt-0 space-y-6 max-w-5xl mx-auto w-full relative z-10">
        
        {/* Header */}
        <section className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent flex items-center gap-2">
              <SettingsIcon className="w-6 h-6 text-indigo-400" />
              Settings & Rules
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Configure your default currency, risk parameters, and pre-trade checklist confluences.
            </p>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-650 hover:to-violet-700 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/10"
          >
            {saving ? (
              <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Configuration
          </button>
        </section>

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold animate-pulse">
            ✓ {successMsg}
          </div>
        )}

        {/* --- SETTINGS CARDS LAYOUT --- */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Column 1 & 2: Risk & Checklist */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Risk Parameters Card */}
            <Card>
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-4.5 h-4.5 text-indigo-400" />
                Risk & Account Parameters
              </h4>
              <p className="text-[10px] text-slate-500 mb-5">Define default position size settings and hard limits</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Currency select */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-slate-650" />
                    Preferred Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-900 focus:outline-none focus:border-indigo-500/40 text-slate-200"
                  >
                    <option value="USD">USD ($) - Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="BTC">BTC (₿) - Bitcoin</option>
                  </select>
                </div>

                {/* Timezone select */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-slate-650" />
                    Timezone
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-900 focus:outline-none focus:border-indigo-500/40 text-slate-200"
                  >
                    <option value="GMT-5">GMT-5 (EST - New York)</option>
                    <option value="GMT+0">GMT+0 (GMT - London)</option>
                    <option value="GMT+8">GMT+8 (SGT - Singapore)</option>
                    <option value="GMT+9">GMT+9 (JST - Tokyo)</option>
                  </select>
                </div>

                {/* Risk Limit % */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Max Risk per Trade (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={riskLimit}
                    onChange={(e) => setRiskLimit(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-900 focus:outline-none focus:border-indigo-500/40 text-slate-200"
                  />
                </div>

                {/* Default Lot Size */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Default Lot Size</label>
                  <input
                    type="number"
                    step="0.01"
                    value={defaultLotSize}
                    onChange={(e) => setDefaultLotSize(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-900 focus:outline-none focus:border-indigo-500/40 text-slate-200"
                  />
                </div>
              </div>
            </Card>

            {/* Checklist Customization Card */}
            <Card>
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5 mb-1">
                <Layers className="w-4.5 h-4.5 text-indigo-400" />
                Customize Trading Checklist
              </h4>
              <p className="text-[10px] text-slate-500 mb-5">Define the confluences required for your trades</p>

              {/* Add form */}
              <form onSubmit={handleAddChecklistItem} className="flex gap-3 mb-4 text-xs">
                <input
                  type="text"
                  required
                  placeholder="e.g. Higher timeframe liquidity sweep"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-900 focus:outline-none focus:border-indigo-500/40 text-slate-200"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-350 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Rule
                </button>
              </form>

              {/* Checklist items list */}
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {checklist.map((item, index) => (
                  <div 
                    key={index}
                    className="p-3 bg-slate-950/20 border border-slate-900/60 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-350"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklistItem(index)}
                      className="p-1 rounded bg-slate-900 border border-slate-800/80 text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </Card>

          </div>

          {/* Column 3: Profile Settings & Controls */}
          <div className="space-y-6">
            
            {/* User Profile Card */}
            <Card>
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5 mb-4">
                <User className="w-4.5 h-4.5 text-indigo-400" />
                Profile Identity
              </h4>

              <div className="space-y-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 text-sm">
                    {user.displayName?.substring(0, 2).toUpperCase() || 'TR'}
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-200 text-[13px]">{user.displayName || 'Trader Account'}</h5>
                    <p className="text-[10px] text-slate-500 font-medium">{user.email}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-900/60 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-550 font-bold uppercase tracking-wider">Sync State</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <FolderSync className="w-3.5 h-3.5" />
                      Active Cloud Sync
                    </span>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full mt-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 text-rose-400 font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out Session
                  </button>
                </div>
              </div>
            </Card>

          </div>

        </section>

      </main>
    </div>
  );
}
