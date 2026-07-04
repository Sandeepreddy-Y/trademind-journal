'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTrades } from '../../context/TradeContext';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import TradeForm from '../../components/journal/TradeForm';
import { 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Edit3, 
  Eye, 
  Plus, 
  Tag,
  Calendar,
  Layers,
  Sparkles,
  ChevronDown,
  X,
  FileSpreadsheet,
  FileText,
  Upload,
  AlertCircle
} from 'lucide-react';

export default function Journal() {
  const { user, loading: authLoading } = useAuth();
  const { trades, deleteTrade, bulkAddTrades, loading: tradesLoading } = useTrades();
  const router = useRouter();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sessionFilter, setSessionFilter] = useState('All');
  const [pairFilter, setPairFilter] = useState('All');
  const [tagFilter, setTagFilter] = useState('All');
  const [strategyFilter, setStrategyFilter] = useState('All');

  // Modal / Editing / Lightbox States
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editTradeId, setEditTradeId] = useState<string | undefined>(undefined);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [selectedTradeForDetails, setSelectedTradeForDetails] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || tradesLoading || !user) {
    return (
      <div className="min-h-screen bg-[#06070a] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest animate-pulse">Syncing Journal...</p>
      </div>
    );
  }

  // --- FILTERS OPTIONS GENERATORS ---
  const uniquePairs = Array.from(new Set(trades.map((t) => t.pair))).filter(Boolean);
  const uniqueTags = Array.from(new Set(trades.flatMap((t) => t.tags || []))).filter(Boolean);
  const uniqueStrategies = Array.from(new Set(trades.map((t) => t.strategy))).filter(Boolean);

  // --- FILTER LOGIC ---
  const filteredTrades = trades.filter((trade) => {
    // 1. Search Query
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      trade.pair.toLowerCase().includes(searchLower) ||
      trade.reason?.toLowerCase().includes(searchLower) ||
      trade.notes?.toLowerCase().includes(searchLower) ||
      trade.logic?.toLowerCase().includes(searchLower) ||
      trade.session?.toLowerCase().includes(searchLower) ||
      trade.tags?.some(tag => tag.toLowerCase().includes(searchLower));

    // 2. Filters
    const matchesDirection = directionFilter === 'All' || trade.direction === directionFilter;
    const matchesStatus = statusFilter === 'All' || trade.status === statusFilter;
    const matchesSession = sessionFilter === 'All' || trade.session === sessionFilter;
    const matchesPair = pairFilter === 'All' || trade.pair === pairFilter;
    const matchesTag = tagFilter === 'All' || trade.tags?.includes(tagFilter);
    const matchesStrategy = strategyFilter === 'All' || trade.strategy === strategyFilter;

    return matchesSearch && matchesDirection && matchesStatus && matchesSession && matchesPair && matchesTag && matchesStrategy;
  });

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this trade log?')) {
      try {
        await deleteTrade(id);
      } catch (e) {
        console.error('Delete error:', e);
      }
    }
  };

  const handleEdit = (id: string) => {
    setEditTradeId(id);
    setIsLogModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditTradeId(undefined);
    setIsLogModalOpen(true);
  };

  const [importingState, setImportingState] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importFeedback, setImportFeedback] = useState<{ imported: number; skipped: number } | null>(null);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingState(true);
    setImportError(null);
    setImportFeedback(null);

    try {
      const text = await file.text();
      let parsedTrades: any[] = [];

      // Check if MT5 HTML report or CSV
      const isHtml = file.name.endsWith('.html') || file.name.endsWith('.htm') || text.includes('<html') || text.includes('<table');

      if (isHtml) {
        // Parse MT5 HTML report
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const rows = doc.querySelectorAll('tr');

        rows.forEach((row) => {
          const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent?.trim() || '');
          if (cells.length >= 13) {
            const ticket = parseInt(cells[0]);
            if (isNaN(ticket) || ticket <= 0) return;

            const typeRaw = cells[2].toLowerCase();
            if (!typeRaw.includes('buy') && !typeRaw.includes('sell')) return;

            const volume = parseFloat(cells[3]);
            const symbol = cells[4];
            const entryPrice = parseFloat(cells[5]);
            const sl = parseFloat(cells[6]) || 0;
            const tp = parseFloat(cells[7]) || 0;
            const exitPrice = parseFloat(cells[9]);
            const commission = parseFloat(cells[10]) || 0;
            const swap = parseFloat(cells[11]) || 0;
            const profit = parseFloat(cells[12]);

            if (!symbol || isNaN(volume) || isNaN(entryPrice) || isNaN(exitPrice) || isNaN(profit)) return;

            const openTimeRaw = cells[1].replace(/\./g, '-');
            const closeTimeRaw = cells[8].replace(/\./g, '-');

            const openParts = openTimeRaw.split(' ');
            const entryDate = openParts[0];
            const entryTime = openParts[1] ? openParts[1].substring(0, 5) : '00:00';

            parsedTrades.push({
              pair: symbol.toUpperCase(),
              direction: typeRaw.includes('buy') ? 'Buy' : 'Sell',
              lotSize: volume,
              entryPrice: entryPrice,
              stopLoss: sl,
              takeProfit: tp,
              exitPrice: exitPrice,
              commission: commission,
              swap: swap,
              pnl: profit,
              date: entryDate,
              time: entryTime,
              notes: `Imported from MT5 HTML Report. Comment: ${cells[13] || ''}`,
              reason: 'MT5 HTML Import',
              logic: 'Imported trade history',
              entryConfirmations: [],
              emotion: 'Calm',
              confidence: 5,
              mistakes: [],
              lessons: '',
              improvement: '',
              tags: ['mt5-import', 'html-upload'],
              strategy: 'MT5 Import',
              riskPct: 1,
              rewardPct: 2,
              mt5Ticket: ticket,
              source: 'MT5 HTML'
            });
          }
        });
      } else {
        // Parse CSV file
        const lines = text.split('\n');
        if (lines.length < 2) {
          throw new Error('CSV file is empty or invalid.');
        }

        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        const idxPair = headers.indexOf('pair');
        const idxSymbol = headers.indexOf('symbol');
        const idxDirection = headers.indexOf('direction');
        const idxType = headers.indexOf('type');
        const idxLots = headers.indexOf('lot size');
        const idxVolume = headers.indexOf('volume');
        const idxEntryPrice = headers.indexOf('entry price');
        const idxExitPrice = headers.indexOf('exit price');
        const idxSL = headers.indexOf('stop loss');
        const idxTP = headers.indexOf('take profit');
        const idxPnL = headers.indexOf('pnl');
        const idxProfit = headers.indexOf('profit');
        const idxDate = headers.indexOf('date');
        const idxTime = headers.indexOf('time');
        const idxCommission = headers.indexOf('commission');
        const idxSwap = headers.indexOf('swap');

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const cells = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));

          const pairVal = cells[idxPair !== -1 ? idxPair : (idxSymbol !== -1 ? idxSymbol : 0)];
          const directionVal = cells[idxDirection !== -1 ? idxDirection : (idxType !== -1 ? idxType : 1)];
          const lotVal = parseFloat(cells[idxLots !== -1 ? idxLots : (idxVolume !== -1 ? idxVolume : 2)]);
          const entryVal = parseFloat(cells[idxEntryPrice !== -1 ? idxEntryPrice : 3]);
          const exitVal = parseFloat(cells[idxExitPrice !== -1 ? idxExitPrice : 4]);
          const slVal = parseFloat(cells[idxSL !== -1 ? idxSL : -1]) || 0;
          const tpVal = parseFloat(cells[idxTP !== -1 ? idxTP : -1]) || 0;
          const pnlVal = parseFloat(cells[idxPnL !== -1 ? idxPnL : (idxProfit !== -1 ? idxProfit : -1)]) || 0;
          const dateVal = cells[idxDate !== -1 ? idxDate : -1] || new Date().toISOString().split('T')[0];
          const timeVal = cells[idxTime !== -1 ? idxTime : -1] || '00:00';
          const commissionVal = parseFloat(cells[idxCommission !== -1 ? idxCommission : -1]) || 0;
          const swapVal = parseFloat(cells[idxSwap !== -1 ? idxSwap : -1]) || 0;

          if (pairVal && directionVal && !isNaN(lotVal) && !isNaN(entryVal) && !isNaN(exitVal)) {
            parsedTrades.push({
              pair: pairVal.toUpperCase(),
              direction: directionVal.toLowerCase().includes('buy') ? 'Buy' : 'Sell',
              lotSize: lotVal,
              entryPrice: entryVal,
              stopLoss: slVal,
              takeProfit: tpVal,
              exitPrice: exitVal,
              commission: commissionVal,
              swap: swapVal,
              pnl: pnlVal,
              date: dateVal,
              time: timeVal,
              notes: 'Imported from CSV File',
              reason: 'CSV Import',
              logic: 'Imported trade history',
              entryConfirmations: [],
              emotion: 'Calm',
              confidence: 5,
              mistakes: [],
              lessons: '',
              improvement: '',
              tags: ['csv-import'],
              strategy: 'CSV Import',
              riskPct: 1,
              rewardPct: 2,
              source: 'CSV Upload'
            });
          }
        }
      }

      if (parsedTrades.length === 0) {
        throw new Error('No valid trades found in the file. Ensure the table columns or CSV headers match.');
      }

      const result = await bulkAddTrades(parsedTrades);
      setImportFeedback(result);
    } catch (err: any) {
      console.error(err);
      setImportError(err.message || 'Failed to process file');
    } finally {
      setImportingState(false);
    }
  };

  // --- DATA EXPORT ACTIONS ---
  
  // 1. EXPORT TO CSV
  const exportToCSV = () => {
    if (trades.length === 0) return;
    
    const headers = [
      'Date', 'Time', 'Pair', 'Direction', 'Lot Size', 'Entry Price', 
      'Stop Loss', 'Take Profit', 'Exit Price', 'PnL', 'R:R', 
      'Session', 'Strategy', 'Emotion', 'Confidence', 'Mistakes', 'Notes'
    ];
    
    const rows = trades.map(t => [
      t.date, t.time, t.pair, t.direction, t.lotSize, t.entryPrice,
      t.stopLoss, t.takeProfit, t.exitPrice, t.pnl, t.rr,
      t.session, t.strategy, t.emotion, t.confidence,
      t.mistakes?.join('; ') || '', t.notes.replace(/,/g, ' ')
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `trademind_journal_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. EXPORT TO EXCEL (CSV format configured with tab delimiter)
  const exportToExcel = () => {
    exportToCSV(); // For client-side standard, CSV is Excel-compatible
  };

  // 3. EXPORT TO PDF (Print Window trigger with print CSS styles)
  const triggerPDFExport = () => {
    window.print();
  };

  return (
    <div className="flex min-h-screen bg-[#07080c] text-slate-100 pl-0 md:pl-64">
      {/* Navigation sidebar */}
      <Sidebar />

      {/* Main Container */}
      <main className="flex-1 px-6 py-8 mt-16 md:mt-0 space-y-6 max-w-7xl mx-auto w-full relative z-10 print:p-0 print:m-0">
        
        {/* Header Section */}
        <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent">
              Trade Journal
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Log, review, and filter your trade setups and screenshot confluences.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Export Menu */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsImportModalOpen(true)}
                title="Import Trades (CSV/HTML)"
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/20 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
              </button>
              <button
                onClick={exportToCSV}
                title="Export CSV"
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/20 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
              <button
                onClick={triggerPDFExport}
                title="Print / Save PDF"
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/20 transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleOpenNew}
              className="flex-1 sm:flex-none py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              New Trade Log
            </button>
          </div>
        </section>

        {/* --- GLOBAL SEARCH & FILTERS BAR --- */}
        <section className="glass-panel p-5 rounded-2xl border border-slate-900/60 space-y-4 print:hidden">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Search trades by Pair, Tag, Strategy, Reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 text-slate-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Pair Filter */}
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Pair</span>
              <select
                value={pairFilter}
                onChange={(e) => setPairFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-350 focus:outline-none focus:border-indigo-500/40"
              >
                <option value="All">All Pairs</option>
                {uniquePairs.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Direction Filter */}
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Direction</span>
              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-350 focus:outline-none focus:border-indigo-500/40"
              >
                <option value="All">All Actions</option>
                <option value="Buy">BUY</option>
                <option value="Sell">SELL</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-350 focus:outline-none focus:border-indigo-500/40"
              >
                <option value="All">All Statuses</option>
                <option value="Win">Wins</option>
                <option value="Loss">Losses</option>
                <option value="Break Even">Break Even</option>
                <option value="Open">Open Trades</option>
              </select>
            </div>

            {/* Session Filter */}
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Session</span>
              <select
                value={sessionFilter}
                onChange={(e) => setSessionFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-350 focus:outline-none focus:border-indigo-500/40"
              >
                <option value="All">All Sessions</option>
                <option value="Asian">Asian</option>
                <option value="London">London</option>
                <option value="New York">New York</option>
                <option value="Overlap">Overlap</option>
              </select>
            </div>

            {/* Custom Tag Filter */}
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Tag</span>
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-350 focus:outline-none focus:border-indigo-500/40"
              >
                <option value="All">All Tags</option>
                {uniqueTags.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>

            {/* Strategy Filter */}
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Strategy</span>
              <select
                value={strategyFilter}
                onChange={(e) => setStrategyFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-350 focus:outline-none focus:border-indigo-500/40"
              >
                <option value="All">All Strategies</option>
                {uniqueStrategies.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* --- MAIN TRADES LISTING --- */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-2 print:hidden">
            <span className="text-xs font-semibold text-slate-500">
              Showing {filteredTrades.length} of {trades.length} trades
            </span>
          </div>

          {filteredTrades.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredTrades.map((t) => {
                const statusStyles = {
                  Win: 'border-emerald-500/20 bg-emerald-500/[0.02]',
                  Loss: 'border-rose-500/20 bg-rose-500/[0.02]',
                  'Break Even': 'border-slate-800 bg-slate-800/[0.02]',
                  Open: 'border-blue-500/20 bg-blue-500/[0.02]'
                };

                const statusPill = {
                  Win: 'bg-win-light text-win border border-emerald-500/10',
                  Loss: 'bg-loss-light text-loss border border-rose-500/10',
                  'Break Even': 'bg-be-light text-be border border-slate-700/20',
                  Open: 'bg-open-light text-open border border-blue-500/20'
                };

                return (
                  <Card 
                    key={t.id} 
                    className={`border ${statusStyles[t.status]} p-5 hover:border-slate-700 transition-all`}
                  >
                    {/* Header: Pair / Action / Date / PnL */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      
                      {/* Left: Info details */}
                      <div className="flex items-center gap-4">
                        <div className={`text-xs px-3 py-1.5 rounded-xl font-bold uppercase ${statusPill[t.status]}`}>
                          {t.status}
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                            {t.pair}
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${t.direction === 'Buy' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-500'}`}>
                              {t.direction}
                            </span>
                          </h3>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-500 text-[10px] font-semibold mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {t.date} {t.time}
                            </span>
                            <span>|</span>
                            <span>Session: <strong className="text-slate-400">{t.session}</strong></span>
                            {t.strategy && (
                              <>
                                <span>|</span>
                                <span>Strat: <strong className="text-slate-400">{t.strategy}</strong></span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Cash PnL & Action buttons */}
                      <div className="flex items-center gap-6 justify-between w-full sm:w-auto">
                        <div className="text-right">
                          <p className={`text-lg font-bold ${t.pnl > 0 ? 'text-win' : t.pnl < 0 ? 'text-loss' : 'text-slate-400'}`}>
                            {t.pnl >= 0 ? '+' : ''}${t.pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                          <span className="text-[10px] text-slate-500 font-semibold block">Risk-to-Reward 1:{t.rr}</span>
                        </div>

                        {/* Actions block */}
                        <div className="flex items-center gap-1.5 print:hidden">
                          <button
                            onClick={() => setSelectedTradeForDetails(t)}
                            title="Inspect Details"
                            className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-slate-400 hover:text-white cursor-pointer"
                          >
                            <Eye className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => handleEdit(t.id)}
                            title="Edit Log"
                            className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-slate-400 hover:text-white cursor-pointer"
                          >
                            <Edit3 className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            title="Delete Log"
                            className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Trade Parameters Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3.5 mt-5 pt-4 border-t border-slate-900/60 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase block">Lot Size</span>
                        <span className="font-bold text-slate-200 mt-0.5 block">{t.lotSize}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase block">Entry Price</span>
                        <span className="font-bold text-slate-200 mt-0.5 block">${t.entryPrice.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase block">Stop Loss</span>
                        <span className="font-bold text-slate-250 mt-0.5 block">${t.stopLoss.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase block">Take Profit</span>
                        <span className="font-bold text-slate-250 mt-0.5 block">${t.takeProfit.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase block">Exit Price</span>
                        <span className="font-bold text-slate-200 mt-0.5 block">${t.exitPrice > 0 ? t.exitPrice.toFixed(2) : '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase block">Trading State</span>
                        <span className="font-bold text-slate-200 mt-0.5 block">{t.emotion || 'Calm'}</span>
                      </div>
                    </div>

                    {/* Tags row */}
                    {t.tags && t.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {t.tags.map((tag) => (
                          <div 
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-semibold text-slate-400"
                          >
                            <Tag className="w-3.5 h-3.5 text-slate-500" />
                            {tag}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3 border border-dashed border-slate-800 rounded-3xl bg-slate-950/10">
              <Layers className="w-9 h-9 text-slate-650" />
              <div>
                <p className="text-sm text-slate-400 font-bold">No matching trades found</p>
                <p className="text-xs text-slate-500 max-w-xs mt-1">Try resetting your filter parameters or adjust the search string.</p>
              </div>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setDirectionFilter('All');
                  setStatusFilter('All');
                  setSessionFilter('All');
                  setPairFilter('All');
                  setTagFilter('All');
                  setStrategyFilter('All');
                }}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              >
                Clear all filters
              </button>
            </div>
          )}
        </section>
      </main>

      {/* --- ADD / EDIT OVERLAY MODAL --- */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title={editTradeId ? 'Modify Trade Log' : 'New Journal Entry'}
        size="xl"
      >
        <TradeForm editTradeId={editTradeId} onClose={() => setIsLogModalOpen(false)} />
      </Modal>

      {/* --- IMAGE LIGHTBOX OVERLAY --- */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <button className="absolute top-6 right-6 p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
          <img 
            src={lightboxImage} 
            alt="Enlarged screenshot" 
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-slate-850" 
          />
        </div>
      )}

      {/* --- DETAILED TRADE INSPECTOR MODAL --- */}
      <Modal
        isOpen={!!selectedTradeForDetails}
        onClose={() => setSelectedTradeForDetails(null)}
        title={selectedTradeForDetails ? `Trade Detail: ${selectedTradeForDetails.pair} (${selectedTradeForDetails.direction})` : ''}
        size="xl"
      >
        {selectedTradeForDetails && (
          <div className="space-y-6 text-xs text-slate-350">
            {/* Header statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-950/40 border border-slate-900">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">Profit & Loss</span>
                <span className={`text-base font-extrabold ${selectedTradeForDetails.pnl >= 0 ? 'text-win' : 'text-loss'}`}>
                  {selectedTradeForDetails.pnl >= 0 ? '+' : ''}${selectedTradeForDetails.pnl.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">Holding Duration</span>
                <span className="text-base font-extrabold text-slate-200">
                  {selectedTradeForDetails.holdingTime ? `${selectedTradeForDetails.holdingTime} min` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">Confidence Level</span>
                <span className="text-base font-extrabold text-indigo-400">
                  {selectedTradeForDetails.confidence || 5} / 10
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">Execution State</span>
                <span className="text-base font-extrabold text-slate-200">
                  {selectedTradeForDetails.emotion || 'Calm'}
                </span>
              </div>
            </div>

            {/* Confirmations List */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">Trade Confluences</span>
              <div className="flex flex-wrap gap-2">
                {selectedTradeForDetails.entryConfirmations && selectedTradeForDetails.entryConfirmations.length > 0 ? (
                  selectedTradeForDetails.entryConfirmations.map((c: string) => (
                    <span key={c} className="px-2.5 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 font-bold text-[10px]">
                      ✓ {c}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 font-semibold">No confluences logged</span>
                )}
              </div>
            </div>

            {/* Notes Sections */}
            <div className="space-y-4 pt-2">
              {selectedTradeForDetails.reason && (
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Reason for Entry</span>
                  <div className="p-4 rounded-2xl bg-slate-950/30 border border-slate-900 text-slate-200 leading-relaxed font-medium">
                    {selectedTradeForDetails.reason}
                  </div>
                </div>
              )}

              {selectedTradeForDetails.notes && (
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Trade Notes</span>
                  <div className="p-4 rounded-2xl bg-slate-950/30 border border-slate-900 text-slate-200 leading-relaxed">
                    {selectedTradeForDetails.notes}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedTradeForDetails.lessons && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">Lessons Learned</span>
                    <div className="p-3.5 rounded-2xl bg-slate-950/30 border border-slate-900 text-slate-250">
                      {selectedTradeForDetails.lessons}
                    </div>
                  </div>
                )}
                {selectedTradeForDetails.improvement && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">Improvement Notes</span>
                    <div className="p-3.5 rounded-2xl bg-slate-950/30 border border-slate-900 text-slate-250">
                      {selectedTradeForDetails.improvement}
                    </div>
                  </div>
                )}
              </div>

              {selectedTradeForDetails.mistakes && selectedTradeForDetails.mistakes.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Mistakes Noted</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTradeForDetails.mistakes.map((m: string) => (
                      <span key={m} className="px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 font-semibold text-[10px]">
                        ✗ {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Screenshots grid */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">Attached Screenshots (click to enlarge)</span>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {selectedTradeForDetails.beforeImage && (
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-500 font-bold block text-center">Before Entry</span>
                    <img 
                      src={selectedTradeForDetails.beforeImage} 
                      onClick={() => {
                        setLightboxImage(selectedTradeForDetails.beforeImage);
                        setSelectedTradeForDetails(null);
                      }}
                      className="w-full h-24 object-cover rounded-xl border border-slate-800 cursor-zoom-in hover:border-indigo-500/50 transition-colors" 
                    />
                  </div>
                )}
                {selectedTradeForDetails.afterImage && (
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-500 font-bold block text-center">After Exit</span>
                    <img 
                      src={selectedTradeForDetails.afterImage} 
                      onClick={() => {
                        setLightboxImage(selectedTradeForDetails.afterImage);
                        setSelectedTradeForDetails(null);
                      }}
                      className="w-full h-24 object-cover rounded-xl border border-slate-800 cursor-zoom-in hover:border-indigo-500/50 transition-colors" 
                    />
                  </div>
                )}
                {selectedTradeForDetails.tvImage && (
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-500 font-bold block text-center">TradingView Chart</span>
                    <img 
                      src={selectedTradeForDetails.tvImage} 
                      onClick={() => {
                        setLightboxImage(selectedTradeForDetails.tvImage);
                        setSelectedTradeForDetails(null);
                      }}
                      className="w-full h-24 object-cover rounded-xl border border-slate-800 cursor-zoom-in hover:border-indigo-500/50 transition-colors" 
                    />
                  </div>
                )}
                {selectedTradeForDetails.mt5Image && (
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-500 font-bold block text-center">MT5 Execution</span>
                    <img 
                      src={selectedTradeForDetails.mt5Image} 
                      onClick={() => {
                        setLightboxImage(selectedTradeForDetails.mt5Image);
                        setSelectedTradeForDetails(null);
                      }}
                      className="w-full h-24 object-cover rounded-xl border border-slate-800 cursor-zoom-in hover:border-indigo-500/50 transition-colors" 
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end pt-4 border-t border-slate-800/40">
              <button
                onClick={() => setSelectedTradeForDetails(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer uppercase text-[10px] tracking-wider font-bold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* --- BULK IMPORT MODAL --- */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportError(null);
          setImportFeedback(null);
        }}
        title="Import Trades (MetaTrader 5 / CSV)"
        size="lg"
      >
        <div className="space-y-5 text-xs text-slate-350">
          <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 space-y-2">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Easy Import via MT5 HTML Report (Recommended)
            </h4>
            <ol className="list-decimal pl-4 space-y-1 text-slate-400 leading-relaxed text-[10px]">
              <li>Open your <strong>MetaTrader 5 (MT5)</strong> terminal.</li>
              <li>Go to the <strong>History</strong> tab in the toolbox (Ctrl + T).</li>
              <li>Right-click anywhere in your history list and select <strong>Report → HTML</strong>.</li>
              <li>Save the HTML report file, then drop or select it here to import instantly!</li>
            </ol>
          </div>

          {!importFeedback ? (
            <div className="space-y-4">
              <div className="relative group border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-8 transition-all flex flex-col items-center justify-center text-center gap-3 bg-slate-950/30">
                <input
                  type="file"
                  accept=".html,.htm,.csv"
                  onChange={handleImportFile}
                  disabled={importingState}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-200">
                    {importingState ? 'Processing file...' : 'Choose file or drag here'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Supports MT5 HTML Reports (.html) or custom CSV files (.csv)</p>
                </div>
                {importingState && (
                  <div className="w-6 h-6 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin mt-2"></div>
                )}
              </div>

              {importError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-450 shrink-0 mt-0.5" />
                  <p className="font-medium">{importError}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-200 text-sm">Import Completed Successfully!</h4>
                  <p className="text-slate-450">Your trade history has been updated in real-time.</p>
                </div>
                <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto pt-2">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-900">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Imported</span>
                    <span className="text-lg font-extrabold text-emerald-400">{importFeedback.imported}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-900">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Duplicates Skipped</span>
                    <span className="text-lg font-extrabold text-slate-400">{importFeedback.skipped}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportFeedback(null);
                  }}
                  className="py-2.5 px-6 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold transition-all cursor-pointer text-xs"
                >
                  View Journal
                </button>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-900/60 text-[10px] text-slate-500 font-medium leading-relaxed">
            <p>
              Note: Duplicate detection automatically screens incoming trades against existing entries using order tickets and signature pricing to keep your statistics clean.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
