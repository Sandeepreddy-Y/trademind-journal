'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTrades } from '../../context/TradeContext';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/ui/Card';
import { formatHoldingTime } from '../../utils/tradeUtils';
import {
  MonitorSmartphone,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowDownToLine,
  Clock,
  Zap,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Activity,
  Wifi,
  WifiOff,
  FileCode2,
  Layers,
  Info,
} from 'lucide-react';

interface SyncStatus {
  trades: any[];
  count: number;
  lastSync: number;
  lastCount: number;
}

export default function MT5Sync() {
  const { user, loading: authLoading } = useAuth();
  const { trades, importMT5Trades, loading: tradesLoading } = useTrades();
  const router = useRouter();

  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [polling, setPolling] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [setupType, setSetupType] = useState<'ea' | 'script'>('ea');
  const [originUrl, setOriginUrl] = useState('http://localhost:3000');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOriginUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Poll the sync API for pending trades
  const checkForTrades = useCallback(async () => {
    try {
      const res = await fetch('/api/sync-trades');
      const data: SyncStatus = await res.json();
      setSyncStatus(data);
      setError('');
    } catch (err) {
      console.error('Failed to check sync status:', err);
      setError('Failed to connect to sync endpoint');
    }
  }, []);

  // Auto-poll every 3 seconds when polling is enabled
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(checkForTrades, 3000);
    return () => clearInterval(interval);
  }, [polling, checkForTrades]);

  // Initial check on mount
  useEffect(() => {
    if (user) checkForTrades();
  }, [user, checkForTrades]);

  const handleImport = async () => {
    setImporting(true);
    setImportResult(null);
    setError('');

    try {
      const result = await importMT5Trades();
      setImportResult(result);
      // Refresh sync status after import
      await checkForTrades();
    } catch (err: any) {
      setError(err.message || 'Failed to import trades');
    } finally {
      setImporting(false);
    }
  };

  const handleCopyKey = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const togglePolling = () => {
    setPolling((prev) => !prev);
    if (!polling) checkForTrades();
  };

  // Count MT5-imported trades
  const mt5Trades = trades.filter((t) => t.tags?.includes('mt5-import'));
  const pendingCount = syncStatus?.count || 0;

  if (authLoading || tradesLoading || !user) {
    return (
      <div className="min-h-screen bg-[#06070a] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest animate-pulse">
          Connecting to MT5 Bridge...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#07080c] text-slate-100 pl-0 md:pl-64">
      <Sidebar />

      <main className="flex-1 px-6 py-8 mt-16 md:mt-0 space-y-6 max-w-6xl mx-auto w-full relative z-10">
        {/* Header */}
        <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent flex items-center gap-2.5">
              <MonitorSmartphone className="w-6 h-6 text-indigo-400" />
              MetaTrader 5 Sync
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Automatically import closed trades from your MT5 terminal into TradeMind.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Listener Toggle */}
            <button
              onClick={togglePolling}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border ${
                polling
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/5'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {polling ? (
                <>
                  <Wifi className="w-4 h-4 animate-pulse" />
                  Listening...
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4" />
                  Start Listener
                </>
              )}
            </button>

            {/* Manual Refresh */}
            <button
              onClick={checkForTrades}
              className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Status & Import Row */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Pending Trades Card */}
          <Card glowColor="indigo" className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-400 flex items-center gap-1.5">
                <ArrowDownToLine className="w-3.5 h-3.5" />
                Pending Import
              </span>
              <span
                className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border ${
                  pendingCount > 0
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                    : 'bg-slate-900/40 border-slate-800 text-slate-500'
                }`}
              >
                {pendingCount}
              </span>
            </div>

            {pendingCount > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-400 leading-relaxed">
                  <strong className="text-indigo-300">{pendingCount}</strong> trades received from MT5
                  and ready to be imported into your journal.
                </p>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/15 disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 stroke-[2.5]" />
                      Import All Trades
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="py-4 text-center">
                <Clock className="w-7 h-7 text-slate-700 mx-auto mb-2" />
                <p className="text-[11px] text-slate-500 font-medium">
                  No pending trades. Run the script in MT5 to sync.
                </p>
              </div>
            )}
          </Card>

          {/* Total MT5 Trades Card */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                MT5 Trades Imported
              </span>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-3xl font-extrabold text-white font-display">
                {mt5Trades.length}
              </span>
              <span className="text-xs text-slate-500 font-semibold pb-1">
                / {trades.length} total
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-500 font-semibold">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                {mt5Trades.filter((t) => t.status === 'Win').length} Wins
              </span>
              <span className="flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-rose-500" />
                {mt5Trades.filter((t) => t.status === 'Loss').length} Losses
              </span>
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-slate-500" />
                {mt5Trades.filter((t) => t.status === 'Break Even').length} BE
              </span>
            </div>
          </Card>

          {/* Last Sync Info Card */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Last Sync Event
              </span>
            </div>
            {syncStatus?.lastSync ? (
              <div className="space-y-2">
                <span className="text-sm font-bold text-slate-200">
                  {new Date(syncStatus.lastSync).toLocaleString()}
                </span>
                <p className="text-[11px] text-slate-500 font-medium">
                  {syncStatus.lastCount} trade{syncStatus.lastCount !== 1 ? 's' : ''} received from
                  terminal
                </p>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-[11px] text-slate-500 font-medium">No sync events recorded yet</p>
              </div>
            )}
          </Card>
        </section>

        {/* Success / Error Messages */}
        {importResult && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Successfully imported {importResult.imported} trade
            {importResult.imported !== 1 ? 's' : ''}.
            {importResult.skipped > 0 && (
              <span className="text-slate-400 font-medium ml-1">
                ({importResult.skipped} duplicate{importResult.skipped !== 1 ? 's' : ''} skipped)
              </span>
            )}
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Setup Instructions */}
        <section className="space-y-3">
          <button
            onClick={() => setShowSetup(!showSetup)}
            className="w-full flex items-center justify-between p-5 glass-panel rounded-2xl border border-slate-900/60 cursor-pointer hover:border-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <FileCode2 className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-slate-200">MT5 Setup Instructions</h3>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  How to install and run the SyncTrades.mq5 script
                </p>
              </div>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-500">
              {showSetup ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showSetup && (
            <Card className="p-6 space-y-6">
              {/* Tab Selector */}
              <div className="flex p-1 rounded-xl bg-slate-950/60 border border-slate-900">
                <button
                  type="button"
                  onClick={() => setSetupType('ea')}
                  className={`flex-1 py-2 px-3 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    setupType === 'ea'
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Real-time Expert Advisor (EA) — Recommended
                </button>
                <button
                  type="button"
                  onClick={() => setSetupType('script')}
                  className={`flex-1 py-2 px-3 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    setupType === 'script'
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Manual Sync Script
                </button>
              </div>

              {/* API Key Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-400" />
                  Your API Key (User ID)
                </h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Paste this key into the <code className="text-indigo-400">InpApiKey</code> parameter
                  when running the MT5 code. This connects your MT5 trades to your account.
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-900 text-slate-300 font-mono text-xs select-all overflow-x-auto">
                    {user.uid}
                  </div>
                  <button
                    onClick={handleCopyKey}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  {setupType === 'ea' ? 'Expert Advisor Installation' : 'Script Installation'} Steps
                </h4>

                <div className="space-y-3">
                  {(setupType === 'ea'
                    ? [
                        {
                          step: 1,
                          title: 'Copy the EA file',
                          desc: 'Copy TradeMindEA.mq5 from your project root directory to your MT5 Experts folder:',
                          code: 'MQL5\\Experts\\TradeMindEA.mq5',
                        },
                        {
                          step: 2,
                          title: 'Enable WebRequest in MT5',
                          desc: 'Open MT5 → Tools → Options → Expert Advisors → Check "Allow WebRequest for listed URL" and add your domain:',
                          code: originUrl,
                        },
                        {
                          step: 3,
                          title: 'Compile the Expert Advisor',
                          desc: 'Open MetaEditor (F4) → Open TradeMindEA.mq5 → Press Compile (F7). Ensure zero errors or warnings are shown.',
                          code: null,
                        },
                        {
                          step: 4,
                          title: 'Launch the EA on a chart',
                          desc: 'In MT5 Navigator panel: drag TradeMindEA to any active chart. Under Inputs set your API Key, and set Server URL to:',
                          code: `${originUrl}/api/mt5/trades`,
                        },
                        {
                          step: 5,
                          title: 'Enable Algo Trading',
                          desc: 'Check "Allow Algo Trading" in the EA options. Click the "Algo Trading" button in the MT5 top toolbar (it should turn green).',
                          code: null,
                        },
                        {
                          step: 6,
                          title: 'Enjoy Real-time Auto Synchronization',
                          desc: 'The EA will automatically detect and sync every trade as soon as it closes. Trades appear instantly on your TradeMind dashboard without manual refreshing!',
                          code: null,
                        },
                      ]
                    : [
                        {
                          step: 1,
                          title: 'Copy the script file',
                          desc: 'Copy SyncTrades.mq5 from your project root to your MT5 Scripts folder:',
                          code: 'MQL5\\Scripts\\SyncTrades.mq5',
                        },
                        {
                          step: 2,
                          title: 'Enable WebRequest in MT5',
                          desc: 'Open MT5 → Tools → Options → Expert Advisors → Check "Allow WebRequest for listed URL" and add your domain:',
                          code: originUrl,
                        },
                        {
                          step: 3,
                          title: 'Compile the script',
                          desc: 'Open MetaEditor (F4) → Open SyncTrades.mq5 → Press Compile (F7). Ensure zero errors.',
                          code: null,
                        },
                        {
                          step: 4,
                          title: 'Run the script in MT5',
                          desc: 'In MT5 Navigator: double-click SyncTrades under Scripts. Set your API Key and days to sync. Server URL should be set to:',
                          code: `${originUrl}/api/sync-trades`,
                        },
                        {
                          step: 5,
                          title: 'Import into TradeMind',
                          desc: 'After the script prints success, return to this page and click the "Import All Trades" button above to pull the buffered records.',
                          code: null,
                        },
                      ]
                  ).map((item) => (
                    <div
                      key={item.step}
                      className="flex gap-4 p-4 rounded-xl bg-slate-950/20 border border-slate-900/40"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-extrabold text-xs shrink-0">
                        {item.step}
                      </div>
                      <div className="space-y-1 flex-1">
                        <h5 className="text-xs font-bold text-slate-200">{item.title}</h5>
                        <p className="text-[10px] text-slate-500 leading-relaxed">{item.desc}</p>
                        {item.code && (
                          <code className="block mt-1.5 px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800/50 text-indigo-300 font-mono text-[11px] break-all select-all">
                            {item.code}
                          </code>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* What gets auto-calculated */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Auto-Calculated Fields
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    'Risk:Reward Ratio',
                    'Holding Time',
                    'Trading Session',
                    'Day of Week',
                    'Month & Year',
                    'Week Number',
                    'Win/Loss/BE Status',
                    'Net PnL',
                    'Trade Tags',
                  ].map((field) => (
                    <div
                      key={field}
                      className="px-3 py-2 rounded-lg bg-emerald-500/[0.03] border border-emerald-500/10 text-emerald-400 text-[10px] font-bold flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      {field}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </section>

        {/* Recent MT5 Imported Trades Table */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            Recently Imported MT5 Trades
          </h3>

          {mt5Trades.length > 0 ? (
            <div className="glass-panel rounded-2xl border border-slate-900/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-900/60">
                      <th className="text-left px-4 py-3 text-[9px] uppercase tracking-widest font-bold text-slate-500">
                        Pair
                      </th>
                      <th className="text-left px-4 py-3 text-[9px] uppercase tracking-widest font-bold text-slate-500">
                        Dir
                      </th>
                      <th className="text-right px-4 py-3 text-[9px] uppercase tracking-widest font-bold text-slate-500">
                        Lot
                      </th>
                      <th className="text-right px-4 py-3 text-[9px] uppercase tracking-widest font-bold text-slate-500">
                        Entry
                      </th>
                      <th className="text-right px-4 py-3 text-[9px] uppercase tracking-widest font-bold text-slate-500">
                        Exit
                      </th>
                      <th className="text-right px-4 py-3 text-[9px] uppercase tracking-widest font-bold text-slate-500">
                        PnL
                      </th>
                      <th className="text-right px-4 py-3 text-[9px] uppercase tracking-widest font-bold text-slate-500">
                        Comm
                      </th>
                      <th className="text-right px-4 py-3 text-[9px] uppercase tracking-widest font-bold text-slate-500">
                        Swap
                      </th>
                      <th className="text-center px-4 py-3 text-[9px] uppercase tracking-widest font-bold text-slate-500">
                        Session
                      </th>
                      <th className="text-center px-4 py-3 text-[9px] uppercase tracking-widest font-bold text-slate-500">
                        Hold
                      </th>
                      <th className="text-left px-4 py-3 text-[9px] uppercase tracking-widest font-bold text-slate-500">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mt5Trades.slice(0, 25).map((trade) => (
                      <tr
                        key={trade.id}
                        className="border-b border-slate-900/30 hover:bg-slate-900/10 transition-colors"
                      >
                        <td className="px-4 py-3 font-bold text-slate-200">{trade.pair}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              trade.direction === 'Buy'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {trade.direction}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300 font-semibold">
                          {trade.lotSize}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300 font-mono text-[10px]">
                          {trade.entryPrice}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300 font-mono text-[10px]">
                          {trade.exitPrice}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-bold ${
                            trade.pnl > 0
                              ? 'text-emerald-400'
                              : trade.pnl < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {trade.pnl > 0 ? '+' : ''}
                          ${trade.pnl.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 font-medium">
                          ${trade.commission.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 font-medium">
                          ${trade.swap.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              trade.session === 'London'
                                ? 'bg-blue-500/10 text-blue-400'
                                : trade.session === 'New York'
                                ? 'bg-amber-500/10 text-amber-400'
                                : trade.session === 'Overlap'
                                ? 'bg-violet-500/10 text-violet-400'
                                : 'bg-cyan-500/10 text-cyan-400'
                            }`}
                          >
                            {trade.session}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-400 font-medium text-[10px]">
                          {formatHoldingTime(trade.holdingTime)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-medium text-[10px]">
                          {trade.date} {trade.time}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {mt5Trades.length > 25 && (
                <div className="px-4 py-3 border-t border-slate-900/40 text-center">
                  <span className="text-[10px] text-slate-500 font-semibold">
                    Showing 25 of {mt5Trades.length} MT5 trades.{' '}
                    <button
                      onClick={() => router.push('/journal')}
                      className="text-indigo-400 hover:text-indigo-300 cursor-pointer"
                    >
                      View all in Journal →
                    </button>
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-14 flex flex-col items-center justify-center text-center gap-2 glass-panel rounded-2xl border border-dashed border-slate-800">
              <MonitorSmartphone className="w-10 h-10 text-slate-700" />
              <p className="text-slate-400 font-bold text-sm">No MT5 trades imported yet</p>
              <p className="text-slate-500 text-xs max-w-sm">
                Run the SyncTrades.mq5 script in your MetaTrader 5 terminal, then click{' '}
                <strong className="text-indigo-400">Import All Trades</strong> above.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
