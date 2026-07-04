'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTrades } from '../../context/TradeContext';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/ui/Card';
import { 
  EquityCurveChart, 
  DailyPnlChart, 
  DrawdownChart, 
  WinRateChart 
} from '../../components/ui/PerformanceChart';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Calendar, 
  Clock, 
  Layers, 
  Compass, 
  Flame,
  Award
} from 'lucide-react';
import { formatHoldingTime } from '../../utils/tradeUtils';

export default function Statistics() {
  const { user, loading: authLoading } = useAuth();
  const { trades, loading: tradesLoading } = useTrades();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || tradesLoading || !user) {
    return (
      <div className="min-h-screen bg-[#06070a] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest animate-pulse">Computing Statistics...</p>
      </div>
    );
  }

  const closedTrades = trades.filter(t => t.status !== 'Open');

  // --- DERIVE PERFORMANCE METRICS ---
  
  // 1. Profitability by Pair
  const pnlByPair: { [pair: string]: number } = {};
  closedTrades.forEach(t => {
    pnlByPair[t.pair] = (pnlByPair[t.pair] || 0) + t.pnl;
  });

  let bestPair = 'N/A';
  let bestPairPnl = -Infinity;
  let worstPair = 'N/A';
  let worstPairPnl = Infinity;

  Object.entries(pnlByPair).forEach(([pair, pnl]) => {
    if (pnl > bestPairPnl) {
      bestPairPnl = pnl;
      bestPair = pair;
    }
    if (pnl < worstPairPnl) {
      worstPairPnl = pnl;
      worstPair = pair;
    }
  });

  // 2. Profitability by Session
  const pnlBySession: { [session: string]: number } = {
    Asian: 0, London: 0, 'New York': 0, Overlap: 0
  };
  closedTrades.forEach(t => {
    if (t.session) {
      pnlBySession[t.session] = (pnlBySession[t.session] || 0) + t.pnl;
    }
  });

  let bestSession = 'N/A';
  let bestSessionPnl = -Infinity;
  let worstSession = 'N/A';
  let worstSessionPnl = Infinity;

  Object.entries(pnlBySession).forEach(([session, pnl]) => {
    if (pnl > bestSessionPnl) {
      bestSessionPnl = pnl;
      bestSession = session;
    }
    if (pnl < worstSessionPnl) {
      worstSessionPnl = pnl;
      worstSession = session;
    }
  });

  // 3. Average Holding Time
  const validHoldingTrades = closedTrades.filter(t => t.holdingTime && t.holdingTime > 0);
  const avgHoldingTimeMin = validHoldingTrades.length > 0
    ? Math.round(validHoldingTrades.reduce((sum, t) => sum + t.holdingTime, 0) / validHoldingTrades.length)
    : 0;

  // 4. Monthly Growth Data
  const pnlByMonth: { [month: string]: number } = {};
  closedTrades.forEach(t => {
    const monthKey = `${t.month} ${t.year}`;
    pnlByMonth[monthKey] = (pnlByMonth[monthKey] || 0) + t.pnl;
  });

  return (
    <div className="flex min-h-screen bg-[#07080c] text-slate-100 pl-0 md:pl-64">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Container */}
      <main className="flex-1 px-6 py-8 mt-16 md:mt-0 space-y-6 max-w-7xl mx-auto w-full relative z-10">
        
        {/* Header */}
        <section>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent">
            Performance Statistics
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Analyze your edge, drawdown profile, and session metrics.
          </p>
        </section>

        {/* --- PERFORMANCE HIGHLIGHTS GRID --- */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {/* Best Session */}
          <Card>
            <span className="text-[9px] uppercase tracking-widest font-semibold text-slate-500 block">Best Session</span>
            <span className="text-base font-bold text-slate-200 block mt-2 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-emerald-400" />
              {bestSessionPnl > -Infinity ? bestSession : 'N/A'}
            </span>
            <span className="text-[10px] text-win font-semibold mt-1 block">
              {bestSessionPnl > -Infinity ? `+$${bestSessionPnl.toFixed(2)}` : '-'}
            </span>
          </Card>

          {/* Worst Session */}
          <Card>
            <span className="text-[9px] uppercase tracking-widest font-semibold text-slate-500 block">Worst Session</span>
            <span className="text-base font-bold text-slate-200 block mt-2 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-rose-400" />
              {worstSessionPnl < Infinity ? worstSession : 'N/A'}
            </span>
            <span className="text-[10px] text-loss font-semibold mt-1 block">
              {worstSessionPnl < Infinity ? `-$${Math.abs(worstSessionPnl).toFixed(2)}` : '-'}
            </span>
          </Card>

          {/* Most Profitable Pair */}
          <Card>
            <span className="text-[9px] uppercase tracking-widest font-semibold text-slate-500 block">Top Instrument</span>
            <span className="text-base font-bold text-slate-200 block mt-2 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              {bestPair !== 'N/A' ? bestPair : 'N/A'}
            </span>
            <span className="text-[10px] text-win font-semibold mt-1 block">
              {bestPairPnl > -Infinity ? `+$${bestPairPnl.toFixed(2)}` : '-'}
            </span>
          </Card>

          {/* Most Losing Pair */}
          <Card>
            <span className="text-[9px] uppercase tracking-widest font-semibold text-slate-500 block">Losing Instrument</span>
            <span className="text-base font-bold text-slate-200 block mt-2 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-rose-400" />
              {worstPair !== 'N/A' ? worstPair : 'N/A'}
            </span>
            <span className="text-[10px] text-loss font-semibold mt-1 block">
              {worstPairPnl < Infinity ? `-$${Math.abs(worstPairPnl).toFixed(2)}` : '-'}
            </span>
          </Card>

          {/* Average Holding Time */}
          <Card>
            <span className="text-[9px] uppercase tracking-widest font-semibold text-slate-500 block">Avg Hold Time</span>
            <span className="text-base font-bold text-slate-200 block mt-2 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-400" />
              {avgHoldingTimeMin > 0 ? formatHoldingTime(avgHoldingTimeMin) : 'N/A'}
            </span>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {validHoldingTrades.length} trade logs timed
            </span>
          </Card>
        </section>

        {/* --- DUAL CHART PANELS --- */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Equity Curve */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-200">Cumulative Equity Growth</h4>
                <p className="text-[11px] text-slate-500">Timeline of account growth starting from $10,000</p>
              </div>
            </div>
            {closedTrades.length > 0 ? (
              <EquityCurveChart trades={trades} height={245} />
            ) : (
              <div className="h-[245px] flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                Log closed trades to plot your growth
              </div>
            )}
          </Card>

          {/* Drawdown Curve */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-200">Drawdown Curve</h4>
                <p className="text-[11px] text-slate-500">Peak-to-trough account drawdown percentages</p>
              </div>
            </div>
            {closedTrades.length > 0 ? (
              <DrawdownChart trades={trades} height={245} />
            ) : (
              <div className="h-[245px] flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                No drawdown data calculated
              </div>
            )}
          </Card>
        </section>

        {/* --- BOTTOM GRID: DAILY PNL & MONTHLY GROWTH --- */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Daily PnL (last 10 active days) */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-200">Daily Profit & Loss</h4>
                <p className="text-[11px] text-slate-500">Daily net returns across last 10 active trading days</p>
              </div>
            </div>
            {closedTrades.length > 0 ? (
              <DailyPnlChart trades={trades} height={230} />
            ) : (
              <div className="h-[230px] flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                No daily return logs available
              </div>
            )}
          </Card>

          {/* Monthly Growth Summary Card */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-200">Monthly Performance</h4>
                <p className="text-[11px] text-slate-500">Net gains grouped by trading months</p>
              </div>
            </div>

            {Object.keys(pnlByMonth).length > 0 ? (
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {Object.entries(pnlByMonth).map(([monthYear, pnl]) => (
                  <div 
                    key={monthYear}
                    className="p-3 bg-slate-950/20 border border-slate-900/60 rounded-xl flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-slate-350">{monthYear}</span>
                    <span className={`font-extrabold ${pnl >= 0 ? 'text-win' : 'text-loss'}`}>
                      {pnl >= 0 ? '+' : ''}${pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                No monthly data logged
              </div>
            )}
          </Card>

        </section>

      </main>
    </div>
  );
}
