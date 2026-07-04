'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTrades } from '../../context/TradeContext';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import TradeForm from '../../components/journal/TradeForm';
import Checklist from '../../components/ui/Checklist';
import EconomicCalendar from '../../components/ui/EconomicCalendar';
import PositionCalculator from '../../components/ui/PositionCalculator';
import CalendarHeatmap from '../../components/ui/CalendarHeatmap';
import { 
  EquityCurveChart, 
  DailyPnlChart,
  WinRateChart
} from '../../components/ui/PerformanceChart';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  Calculator, 
  Award, 
  Bell, 
  Flame, 
  HelpCircle,
  FolderSync,
  DollarSign,
  Briefcase,
  Layers,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { trades, loading: tradesLoading, settings } = useTrades();
  const router = useRouter();
  
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [showReminder, setShowReminder] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || tradesLoading || !user) {
    return (
      <div className="min-h-screen bg-[#06070a] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest animate-pulse">Syncing TradeMind...</p>
      </div>
    );
  }

  // --- STATISTICS CALCULATIONS ---
  const closedTrades = trades.filter(t => t.status !== 'Open');
  const totalTradesCount = trades.length;
  
  // Account Balance: Starting 10k + cumulative PnL
  const startingBalance = 10000;
  const cumulativePnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const accountBalance = startingBalance + cumulativePnl;

  // Date constants for checks
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Helper to check if date falls in current week
  const isCurrentWeek = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const today = new Date();
      const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
      const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 6));
      return d >= firstDay && d <= lastDay;
    } catch {
      return false;
    }
  };

  // Helper to check if date falls in current month
  const isCurrentMonth = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const today = new Date();
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    } catch {
      return false;
    }
  };

  // Today PnL
  const todayPnL = trades.filter(t => t.date === todayStr).reduce((sum, t) => sum + t.pnl, 0);
  
  // Weekly PnL
  const weeklyPnL = trades.filter(t => isCurrentWeek(t.date)).reduce((sum, t) => sum + t.pnl, 0);
  
  // Monthly PnL
  const monthlyPnL = trades.filter(t => isCurrentMonth(t.date)).reduce((sum, t) => sum + t.pnl, 0);

  // Win Rate
  const winTrades = closedTrades.filter(t => t.status === 'Win');
  const lossTrades = closedTrades.filter(t => t.status === 'Loss');
  const winRate = closedTrades.length > 0 
    ? Math.round((winTrades.length / closedTrades.length) * 100) 
    : 0;

  // Average RR
  const avgRR = closedTrades.length > 0 
    ? Number((closedTrades.reduce((sum, t) => sum + (t.rr || 0), 0) / closedTrades.length).toFixed(2))
    : 0;

  // Profit Factor: Gross Profit / Gross Loss
  const grossProfit = winTrades.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(lossTrades.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = grossLoss > 0 
    ? Number((grossProfit / grossLoss).toFixed(2)) 
    : grossProfit > 0 ? grossProfit : 0;

  // Expectancy = (Win Rate * Avg Win) - (Loss Rate * Avg Loss)
  const avgWin = winTrades.length > 0 ? (grossProfit / winTrades.length) : 0;
  const avgLoss = lossTrades.length > 0 ? (grossLoss / lossTrades.length) : 0;
  const lossRate = 1 - (winRate / 100);
  const expectancy = Number(((winRate / 100) * avgWin - lossRate * avgLoss).toFixed(2));

  // Current Streak Calculation
  const getStreak = () => {
    if (closedTrades.length === 0) return { count: 0, type: 'neutral' };
    
    // Sort closed trades by date descending (already sorted from context usually, but ensure it)
    const sortedClosed = [...closedTrades].sort((a, b) => b.createdAt - a.createdAt);
    const firstStatus = sortedClosed[0].status;
    
    if (firstStatus === 'Break Even') return { count: 0, type: 'neutral' };
    
    let count = 0;
    for (const t of sortedClosed) {
      if (t.status === firstStatus) {
        count++;
      } else if (t.status === 'Break Even') {
        continue; // skip BE in streak
      } else {
        break;
      }
    }
    return { count, type: firstStatus === 'Win' ? 'win' : 'loss' };
  };

  const streak = getStreak();

  const formatPnl = (val: number) => {
    const isNeg = val < 0;
    const absVal = Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (
      <span className={val > 0 ? 'text-win font-bold' : val < 0 ? 'text-loss font-bold' : 'text-slate-400'}>
        {isNeg ? '-' : val > 0 ? '+' : ''}${absVal}
      </span>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#07080c] relative text-slate-100 pl-0 md:pl-64">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Pane */}
      <main className="flex-1 px-6 py-8 mt-16 md:mt-0 space-y-6 max-w-7xl mx-auto w-full relative z-10">
        
        {/* Daily Reminder Alert Banner */}
        {showReminder && (
          <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-indigo-500/5 px-6 py-4 flex items-center justify-between gap-4 shadow-xl shadow-indigo-950/20 animate-fade-in">
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-indigo-500"></div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Bell className="w-4.5 h-4.5 animate-bounce" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200 uppercase tracking-wider">Daily Trading Reminder</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Stay disciplined. Remember to journal all your trades for today to lock in insights.</p>
              </div>
            </div>
            <button 
              onClick={() => setShowReminder(false)}
              className="text-xs text-slate-500 hover:text-slate-300 font-semibold px-2 py-1 hover:bg-slate-900/60 rounded-lg cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Header Section */}
        <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent">
              Trader Workspace
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Welcome back, {user.displayName || 'Trader'}. Monitor your parameters and confluences.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setIsLogModalOpen(true)}
              className="flex-1 sm:flex-none py-2.5 px-5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/15 hover:shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Log New Trade
            </button>
          </div>
        </section>

        {/* 1. QUICK METRICS ROW */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Account Balance */}
          <Card glowColor="indigo">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">Account Balance</span>
              <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-100 mt-3 font-display">
              ${accountBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold mt-1">
              <span>Start: $10,000.00</span>
              <span className="text-slate-800">|</span>
              <span className={cumulativePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {cumulativePnl >= 0 ? '+' : ''}{((cumulativePnl / startingBalance) * 100).toFixed(1)}% Growth
              </span>
            </div>
          </Card>

          {/* Today's PnL */}
          <Card glowColor={todayPnL > 0 ? 'emerald' : todayPnL < 0 ? 'rose' : 'none'}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 font-sans">Today's PnL</span>
              <div className={`p-1.5 rounded-lg border ${
                todayPnL >= 0 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                {todayPnL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-100 mt-3 font-display">
              {formatPnl(todayPnL)}
            </p>
            <div className="text-[10px] text-slate-500 font-semibold mt-1">
              For date: {todayStr}
            </div>
          </Card>

          {/* Weekly PnL */}
          <Card glowColor={weeklyPnL > 0 ? 'emerald' : weeklyPnL < 0 ? 'rose' : 'none'}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">Weekly PnL</span>
              <div className={`p-1.5 rounded-lg border ${
                weeklyPnL >= 0 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                {weeklyPnL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-100 mt-3 font-display">
              {formatPnl(weeklyPnL)}
            </p>
            <div className="text-[10px] text-slate-500 font-semibold mt-1">
              Active weekly range
            </div>
          </Card>

          {/* Monthly PnL */}
          <Card glowColor={monthlyPnL > 0 ? 'emerald' : monthlyPnL < 0 ? 'rose' : 'none'}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">Monthly PnL</span>
              <div className={`p-1.5 rounded-lg border ${
                monthlyPnL >= 0 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                {monthlyPnL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-100 mt-3 font-display">
              {formatPnl(monthlyPnL)}
            </p>
            <div className="text-[10px] text-slate-500 font-semibold mt-1">
              Month of {new Date().toLocaleString('default', { month: 'long' })}
            </div>
          </Card>
        </section>

        {/* 2. CORE STATS PANEL */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Win Rate */}
          <div className="bg-[#0e1017] border border-slate-900/60 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[9px] uppercase tracking-widest font-bold text-slate-500">Win Rate</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-lg font-bold text-slate-100">{winRate}%</span>
              <span className="text-[10px] text-slate-500">closed</span>
            </div>
          </div>

          {/* Average RR */}
          <div className="bg-[#0e1017] border border-slate-900/60 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[9px] uppercase tracking-widest font-bold text-slate-500">Average R:R</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-lg font-bold text-slate-100">1:{avgRR}</span>
              <span className="text-[10px] text-slate-500">ratio</span>
            </div>
          </div>

          {/* Expectancy */}
          <div className="bg-[#0e1017] border border-slate-900/60 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[9px] uppercase tracking-widest font-bold text-slate-500">Expectancy</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className={`text-lg font-bold ${expectancy >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ${expectancy}
              </span>
              <span className="text-[10px] text-slate-500">/ trade</span>
            </div>
          </div>

          {/* Profit Factor */}
          <div className="bg-[#0e1017] border border-slate-900/60 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[9px] uppercase tracking-widest font-bold text-slate-500">Profit Factor</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-lg font-bold text-slate-100">{profitFactor}</span>
              <span className="text-[10px] text-slate-500">index</span>
            </div>
          </div>

          {/* Current Streak */}
          <div className="bg-[#0e1017] border border-slate-900/60 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[9px] uppercase tracking-widest font-bold text-slate-500">Streak Tracker</span>
            <div className="flex items-center gap-1.5 mt-2">
              <Flame className={`w-4 h-4 ${streak.type === 'win' ? 'text-amber-500 fill-amber-500' : streak.type === 'loss' ? 'text-sky-500' : 'text-slate-500'}`} />
              <span className="text-lg font-bold text-slate-100">{streak.count}</span>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">
                {streak.type === 'win' ? 'wins' : streak.type === 'loss' ? 'losses' : 'flat'}
              </span>
            </div>
          </div>

          {/* Total Trades */}
          <div className="bg-[#0e1017] border border-slate-900/60 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[9px] uppercase tracking-widest font-bold text-slate-500">Total Trades</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-lg font-bold text-slate-100">{totalTradesCount}</span>
              <span className="text-[10px] text-slate-500">logged</span>
            </div>
          </div>
        </section>

        {/* 3. CHARTS GRID */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cumulative Equity Curve */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-200">Equity Curve</h4>
                <p className="text-[11px] text-slate-500">Performance timeline over trades</p>
              </div>
              <div className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 font-semibold px-2.5 py-1 rounded-lg">
                Cumulative Growth
              </div>
            </div>
            {totalTradesCount > 0 ? (
              <EquityCurveChart trades={trades} height={230} />
            ) : (
              <div className="h-[230px] flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                Log a trade to see your equity curve
              </div>
            )}
          </Card>

          {/* Win Rate Doughnut */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-200">Distribution</h4>
                <p className="text-[11px] text-slate-500">Win / Loss breakdown</p>
              </div>
              <div className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 font-semibold px-2.5 py-1 rounded-lg">
                Ratios
              </div>
            </div>
            {totalTradesCount > 0 ? (
              <WinRateChart trades={trades} height={200} />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                No trades recorded
              </div>
            )}
          </Card>
        </section>

        {/* 4. SECONDARY LAYOUT GRID (2 COLUMNS) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: HEATMAP & RECENT TRADES */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Heatmap */}
            <Card>
              <CalendarHeatmap trades={trades} />
            </Card>

            {/* Recent Trades Table */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Recent Trades</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Last 5 logs in this journal</p>
                </div>
                <Link
                  href="/journal"
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline"
                >
                  View Journal
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {trades.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-900 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                        <th className="py-2.5">Pair</th>
                        <th className="py-2.5">Type</th>
                        <th className="py-2.5">Lot</th>
                        <th className="py-2.5">Entry</th>
                        <th className="py-2.5">Exit</th>
                        <th className="py-2.5">PnL</th>
                        <th className="py-2.5">R:R</th>
                        <th className="py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/40 text-slate-350">
                      {trades.slice(0, 5).map((t) => {
                        const statusColors = {
                          Win: 'bg-win-light text-win border border-emerald-500/10',
                          Loss: 'bg-loss-light text-loss border border-rose-500/10',
                          'Break Even': 'bg-be-light text-be border border-slate-700/20',
                          Open: 'bg-open-light text-open border border-blue-500/20'
                        };
                        return (
                          <tr key={t.id} className="hover:bg-slate-950/20 transition-colors">
                            <td className="py-3 font-bold text-slate-200">{t.pair}</td>
                            <td className="py-3 font-semibold">
                              <span className={t.direction === 'Buy' ? 'text-indigo-400' : 'text-amber-500'}>
                                {t.direction}
                              </span>
                            </td>
                            <td className="py-3">{t.lotSize}</td>
                            <td className="py-3">${t.entryPrice.toFixed(2)}</td>
                            <td className="py-3">${t.exitPrice > 0 ? t.exitPrice.toFixed(2) : '-'}</td>
                            <td className="py-3 font-semibold">{formatPnl(t.pnl)}</td>
                            <td className="py-3">1:{t.rr}</td>
                            <td className="py-3">
                              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${statusColors[t.status]}`}>
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-center gap-2 border border-dashed border-slate-800 rounded-2xl bg-slate-950/10">
                  <BookOpen className="w-8 h-8 text-slate-600" />
                  <p className="text-xs text-slate-500 font-medium">No trades logged yet.</p>
                  <button 
                    onClick={() => setIsLogModalOpen(true)}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    Log your first trade now
                  </button>
                </div>
              )}
            </Card>
          </div>

          {/* RIGHT COLUMN: TOOLS & WIDGETS */}
          <div className="space-y-6">
            
            {/* Checklist */}
            <Card>
              <Checklist />
            </Card>

            {/* Economic Calendar */}
            <Card>
              <EconomicCalendar />
            </Card>

            {/* Position Size Calculator */}
            <Card>
              <PositionCalculator />
            </Card>
          </div>
        </section>
      </main>

      {/* Log Trade Overlay Modal */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title="Journal Trade Setup"
        size="xl"
      >
        <TradeForm onClose={() => setIsLogModalOpen(false)} />
      </Modal>
    </div>
  );
}
