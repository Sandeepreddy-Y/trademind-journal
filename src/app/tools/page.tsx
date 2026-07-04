'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTrades } from '../../context/TradeContext';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/ui/Card';
import PositionCalculator from '../../components/ui/PositionCalculator';
import Checklist from '../../components/ui/Checklist';
import EconomicCalendar from '../../components/ui/EconomicCalendar';
import { 
  Trophy, 
  TrendingUp, 
  Target, 
  Flame, 
  Compass, 
  Wrench, 
  CheckCircle,
  Plus
} from 'lucide-react';

export default function Tools() {
  const { user, loading: authLoading } = useAuth();
  const { trades, loading: tradesLoading, goals, addGoal } = useTrades();
  const router = useRouter();

  // Create Goal States
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState<number>(100);
  const [goalMetric, setGoalMetric] = useState<'pnl' | 'winRate' | 'tradeCount'>('pnl');
  const [goalTimeframe, setGoalTimeframe] = useState<'weekly' | 'monthly'>('weekly');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || tradesLoading || !user) {
    return (
      <div className="min-h-screen bg-[#06070a] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest animate-pulse">Initializing Tools...</p>
      </div>
    );
  }

  // Calculate Goal Progresses
  const closedTrades = trades.filter(t => t.status !== 'Open');

  const getMetricValue = (metric: 'pnl' | 'winRate' | 'tradeCount', timeframe: 'weekly' | 'monthly') => {
    // Filter closed trades by timeframe
    const today = new Date();
    const thresholdDays = timeframe === 'weekly' ? 7 : 30;
    const thresholdDate = new Date(today.setDate(today.getDate() - thresholdDays));
    const tfTrades = closedTrades.filter(t => new Date(t.date) >= thresholdDate);

    if (metric === 'pnl') {
      return tfTrades.reduce((sum, t) => sum + t.pnl, 0);
    }
    if (metric === 'tradeCount') {
      return tfTrades.length;
    }
    if (metric === 'winRate') {
      const wins = tfTrades.filter(t => t.status === 'Win').length;
      return tfTrades.length > 0 ? Math.round((wins / tfTrades.length) * 100) : 0;
    }
    return 0;
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName) return;

    try {
      await addGoal({
        title: goalName,
        target: goalTarget,
        type: goalTimeframe,
        deadline: '',
        metric: goalMetric,
        timeframe: goalTimeframe,
        progress: 0,
        achieved: false
      });
      setGoalName('');
      setGoalTarget(100);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#07080c] text-slate-100 pl-0 md:pl-64">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Container */}
      <main className="flex-1 px-6 py-8 mt-16 md:mt-0 space-y-6 max-w-7xl mx-auto w-full relative z-10">
        
        {/* Header */}
        <section>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent flex items-center gap-2">
            <Wrench className="w-6 h-6 text-indigo-400" />
            Tools & Utilities
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Access position sizing formulas, news releases, confluences, and goals.
          </p>
        </section>

        {/* --- DUAL WIDGET LAYOUT GRID --- */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Risk & Checklist */}
          <div className="space-y-6">
            <Card>
              <PositionCalculator />
            </Card>
            <Card>
              <Checklist />
            </Card>
          </div>

          {/* Column 2: Economic Calendar */}
          <div className="space-y-6">
            <Card className="h-full">
              <EconomicCalendar />
            </Card>
          </div>

          {/* Column 3: Goal Tracking */}
          <div className="space-y-6">
            {/* Create Goal Card */}
            <Card>
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5 mb-1">
                <Target className="w-4 h-4 text-violet-400" />
                Define Custom Target
              </h4>
              <p className="text-[10px] text-slate-500 mb-4">Set performance landmarks to keep yourself accountable</p>

              <form onSubmit={handleCreateGoal} className="space-y-3.5 text-xs">
                {/* Goal Title */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Goal Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Target Profit, Win Rate Limit"
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-900 focus:outline-none focus:border-indigo-500/40 text-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Metric type */}
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Metric</label>
                    <select
                      value={goalMetric}
                      onChange={(e) => setGoalMetric(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-900 focus:outline-none focus:border-indigo-500/40 text-slate-200"
                    >
                      <option value="pnl">Net PnL ($)</option>
                      <option value="winRate">Win Rate (%)</option>
                      <option value="tradeCount">Trade Count</option>
                    </select>
                  </div>

                  {/* Target Value */}
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Target Value</label>
                    <input
                      type="number"
                      required
                      value={goalTarget}
                      onChange={(e) => setGoalTarget(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-900 focus:outline-none focus:border-indigo-500/40 text-slate-200"
                    />
                  </div>
                </div>

                {/* Timeframe */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Timeframe</label>
                  <select
                    value={goalTimeframe}
                    onChange={(e) => setGoalTimeframe(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-900 focus:outline-none focus:border-indigo-500/40 text-slate-200 text-xs"
                  >
                    <option value="weekly">Weekly Target (last 7 days)</option>
                    <option value="monthly">Monthly Target (last 30 days)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-600 text-white font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  Launch Goal
                </button>
              </form>
            </Card>

            {/* List of Goals */}
            <Card>
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5 mb-4">
                <Trophy className="w-4 h-4 text-amber-500" />
                Active Challenges
              </h4>

              {goals.length > 0 ? (
                <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
                  {goals.map((g) => {
                    const currentVal = getMetricValue(g.metric || 'pnl', g.timeframe || g.type);
                    
                    // Prevent zero divide or cap overflow at 100%
                    let progressPct = 0;
                    if (g.target > 0) {
                      progressPct = Math.min(100, Math.round((currentVal / g.target) * 100));
                    }
                    if (progressPct < 0) progressPct = 0; // handle loss offsets

                    const isDone = progressPct >= 100;

                    return (
                      <div key={g.id} className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-200">{g.title}</span>
                          <span className={`text-[10px] font-bold ${isDone ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`}>
                            {currentVal.toFixed(0)} / {g.target} ({progressPct}%)
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-slate-950 rounded-full border border-slate-900 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 rounded-full bg-gradient-to-r ${
                              isDone 
                                ? 'from-emerald-500 to-green-500 shadow-lg shadow-emerald-500/20' 
                                : 'from-violet-500 to-indigo-500'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center justify-center text-center gap-1.5 border border-dashed border-slate-800 rounded-2xl bg-slate-950/10 text-xs">
                  <CheckCircle className="w-7 h-7 text-slate-650" />
                  <p className="text-slate-500 font-medium">No challenges defined yet</p>
                </div>
              )}
            </Card>
          </div>
        </section>

      </main>
    </div>
  );
}
