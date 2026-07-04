'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTrades } from '../../context/TradeContext';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import { generateTradeReview, generatePortfolioReview } from '../../utils/aiAnalyzer';
import { Trade, AIAnalysisReport } from '../../types';
import { 
  Sparkles, 
  BrainCircuit, 
  TrendingUp, 
  Award, 
  AlertTriangle, 
  HelpCircle, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Calendar,
  Zap,
  Gauge
} from 'lucide-react';

export default function AIReviews() {
  const { user, loading: authLoading } = useAuth();
  const { trades, loading: tradesLoading } = useTrades();
  const router = useRouter();

  // Review states
  const [portfolioTimeframe, setPortfolioTimeframe] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [individualReview, setIndividualReview] = useState<AIAnalysisReport | null>(null);
  
  // Expanded states
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || tradesLoading || !user) {
    return (
      <div className="min-h-screen bg-[#06070a] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest animate-pulse">Running AI Engine...</p>
      </div>
    );
  }

  // Generate Portfolio Review
  const closedTrades = trades.filter(t => t.status !== 'Open');
  
  // Helper to filter trades by timeframe (last 7 days or last 30 days)
  const getTradesForTimeframe = (time: 'weekly' | 'monthly') => {
    const today = new Date();
    const thresholdDays = time === 'weekly' ? 7 : 30;
    const thresholdDate = new Date(today.setDate(today.getDate() - thresholdDays));
    
    return closedTrades.filter(t => new Date(t.date) >= thresholdDate);
  };

  const activeTimeframeTrades = getTradesForTimeframe(portfolioTimeframe);
  const portfolioReview = generatePortfolioReview(activeTimeframeTrades, portfolioTimeframe);

  const toggleTradeExpand = (trade: Trade) => {
    if (expandedTradeId === trade.id) {
      setExpandedTradeId(null);
      setIndividualReview(null);
    } else {
      setExpandedTradeId(trade.id);
      // Generate review on the fly
      const review = generateTradeReview(trade);
      setIndividualReview(review);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/35 bg-emerald-500/5';
    if (score >= 60) return 'text-amber-400 border-amber-500/35 bg-amber-500/5';
    return 'text-rose-400 border-rose-500/35 bg-rose-500/5';
  };

  return (
    <div className="flex min-h-screen bg-[#07080c] text-slate-100 pl-0 md:pl-64">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Container */}
      <main className="flex-1 px-6 py-8 mt-16 md:mt-0 space-y-6 max-w-7xl mx-auto w-full relative z-10">
        
        {/* Header */}
        <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent flex items-center gap-2">
              <BrainCircuit className="w-6 h-6 text-indigo-400" />
              AI Review Coach
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Advanced quantitative evaluation of your execution, risk management, and psychology.
            </p>
          </div>

          {/* Timeframe selector */}
          <div className="flex border border-slate-800/80 bg-slate-950/60 p-1 rounded-xl">
            <button
              onClick={() => setPortfolioTimeframe('weekly')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                portfolioTimeframe === 'weekly'
                  ? 'bg-indigo-650 text-white shadow shadow-indigo-600/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Weekly Review
            </button>
            <button
              onClick={() => setPortfolioTimeframe('monthly')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                portfolioTimeframe === 'monthly'
                  ? 'bg-indigo-650 text-white shadow shadow-indigo-600/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Monthly Review
            </button>
          </div>
        </section>

        {/* --- PORTFOLIO REVIEW SECTION --- */}
        <section>
          <Card glowColor="indigo" className="p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-slate-900/60 pb-6 mb-6">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Portfolio AI Report
                </span>
                <h3 className="text-lg font-bold text-slate-200">
                  {portfolioTimeframe === 'weekly' ? 'Weekly Executive Review' : 'Monthly Performance Audit'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Aggregating {activeTimeframeTrades.length} trades closed in the last {portfolioTimeframe === 'weekly' ? '7' : '30'} days
                </p>
              </div>

              {/* Score Display */}
              <div className="flex items-center gap-4 bg-slate-950/40 border border-slate-900 px-5 py-3 rounded-2xl">
                <div>
                  <span className="text-[9px] uppercase tracking-widest font-semibold text-slate-500 block">AI Discipline Score</span>
                  <span className="text-[10px] text-slate-400 font-medium">Based on risk and rules adherence</span>
                </div>
                <div className={`w-14 h-14 rounded-xl border flex flex-col items-center justify-center font-display font-extrabold text-xl shadow-inner ${getScoreColor(portfolioReview.score)}`}>
                  {portfolioReview.score}
                  <span className="text-[8px] font-semibold text-slate-500 tracking-wider">/100</span>
                </div>
              </div>
            </div>

            {activeTimeframeTrades.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-350">
                {/* Left column: summaries */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block">Risk Management Review</span>
                    <p className="leading-relaxed bg-slate-950/20 border border-slate-900/40 p-4 rounded-2xl text-slate-200">
                      {portfolioReview.riskSummary}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block">Psychology & Discipline Audit</span>
                    <p className="leading-relaxed bg-slate-950/20 border border-slate-900/40 p-4 rounded-2xl text-slate-200">
                      {portfolioReview.psychSummary}
                    </p>
                  </div>
                </div>

                {/* Right column: strengths, setups, recommendations */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 bg-[#10121a]/30 p-4 rounded-2xl border border-slate-900">
                      <span className="text-[9px] uppercase tracking-widest font-bold text-slate-500 block">Best Setup Pattern</span>
                      <span className="font-bold text-slate-200 block mt-1 text-[11px]">{portfolioReview.bestSetup}</span>
                    </div>
                    <div className="space-y-1 bg-[#10121a]/30 p-4 rounded-2xl border border-slate-900">
                      <span className="text-[9px] uppercase tracking-widest font-bold text-slate-500 block">Worst Setup Pattern</span>
                      <span className="font-bold text-slate-200 block mt-1 text-[11px]">{portfolioReview.worstSetup}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block">Critical Action Items</span>
                    <div className="p-4 rounded-2xl bg-indigo-500/[0.02] border border-indigo-500/10 space-y-2">
                      {portfolioReview.suggestions.split('. ').filter(Boolean).map((s, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-slate-200">
                          <span className="text-indigo-400 font-bold shrink-0 mt-0.5">•</span>
                          <span>{s.trim()}.</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-2 border border-dashed border-slate-800 rounded-3xl bg-slate-950/10 text-xs">
                <Calendar className="w-8 h-8 text-slate-650" />
                <p className="text-slate-400 font-bold">No trades found in this timeframe</p>
                <p className="text-slate-500 max-w-xs mt-0.5">Please log trades in your journal to run the portfolio auditing engine.</p>
              </div>
            )}
          </Card>
        </section>

        {/* --- INDIVIDUAL TRADE REVIEWS --- */}
        <section className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-200">Individual Trade Evaluations</h3>
            <p className="text-xs text-slate-500 mt-0.5">Click any trade to expand its detailed AI risk assessment.</p>
          </div>

          {trades.length > 0 ? (
            <div className="space-y-3">
              {trades.map((trade) => {
                const isExpanded = expandedTradeId === trade.id;
                return (
                  <div 
                    key={trade.id}
                    className="glass-panel rounded-2xl border border-slate-900 overflow-hidden transition-all duration-300"
                  >
                    {/* Header bar */}
                    <div 
                      onClick={() => toggleTradeExpand(trade)}
                      className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-900/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          trade.status === 'Win' ? 'bg-emerald-500' : trade.status === 'Loss' ? 'bg-rose-500' : 'bg-slate-500'
                        }`} />
                        <div>
                          <span className="font-bold text-slate-200 text-sm">{trade.pair}</span>
                          <span className="text-[10px] text-slate-500 font-semibold ml-2">{trade.date} {trade.time}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`text-xs font-bold ${trade.pnl >= 0 ? 'text-win' : 'text-loss'}`}>
                          {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                        </span>
                        
                        <div className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-500">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Content */}
                    {isExpanded && individualReview && (
                      <div className="p-5 border-t border-slate-900/60 bg-slate-950/20 space-y-5 text-xs text-slate-350">
                        {/* Score and Overview */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-xl bg-slate-950/40 border border-slate-900">
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold uppercase block">Execution Quality</span>
                            <span className="text-slate-300 font-medium">Confluence-based entry alignment</span>
                          </div>
                          <div className={`px-4 py-2 rounded-xl border font-bold flex items-center gap-2 ${getScoreColor(individualReview.score)}`}>
                            <Gauge className="w-4 h-4" />
                            <span>Score: {individualReview.score} / 100</span>
                          </div>
                        </div>

                        {/* Breakdown Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block">Risk Management</span>
                            <p className="p-4 rounded-xl bg-slate-950/30 border border-slate-900 text-slate-200 leading-relaxed">
                              {individualReview.riskManagement}
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block">Psychology & Invalidation</span>
                            <p className="p-4 rounded-xl bg-slate-950/30 border border-slate-900 text-slate-200 leading-relaxed">
                              {individualReview.psychology}
                            </p>
                          </div>
                        </div>

                        {/* Strengths & Weaknesses */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1 bg-emerald-500/[0.01] border border-emerald-500/10 p-4 rounded-xl">
                            <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-400 block">Key Strengths</span>
                            <p className="text-slate-200 font-semibold mt-1">{individualReview.strengths}</p>
                          </div>
                          <div className="space-y-1 bg-rose-500/[0.01] border border-rose-500/10 p-4 rounded-xl">
                            <span className="text-[10px] uppercase tracking-widest font-bold text-rose-400 block">Execution Failures</span>
                            <p className="text-slate-200 font-semibold mt-1">{individualReview.weaknesses}</p>
                          </div>
                        </div>

                        {/* Recommendations */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block">Coach Suggestions</span>
                          <div className="p-4 rounded-xl bg-indigo-500/[0.02] border border-indigo-500/15 text-indigo-200 leading-relaxed font-semibold">
                            {individualReview.suggestions}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-2 border border-dashed border-slate-800 rounded-3xl bg-slate-950/10 text-xs">
              <BrainCircuit className="w-8 h-8 text-slate-650" />
              <p className="text-slate-400 font-bold">No trades logged yet</p>
              <p className="text-slate-500 max-w-xs mt-0.5">Please add a trade in your journal to access AI coaching insights.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
