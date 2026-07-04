'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { 
  TrendingUp, 
  Sparkles, 
  ShieldCheck, 
  Smartphone, 
  ArrowRight, 
  Activity, 
  BarChart3, 
  BrainCircuit, 
  ChevronRight,
  Play
} from 'lucide-react';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleLaunchApp = () => {
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#06070a] relative overflow-hidden flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background Radial Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] radial-glow pointer-events-none z-0"></div>
      
      {/* Decorative floating grids */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            TM
          </div>
          <span className="font-bold text-xl tracking-wider bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            TradeMind
          </span>
        </div>

        <div className="flex items-center gap-4">
          {loading ? (
            <div className="w-5 h-5 rounded-full border-2 border-slate-700 border-t-indigo-500 animate-spin"></div>
          ) : user ? (
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 flex items-center gap-2"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link 
                href="/login" 
                className="text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-white transition-all"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-10 pb-20 flex-1 flex flex-col items-center justify-center text-center">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-6 animate-fade-in shadow-inner">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Generation AI Trading Journal</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1] max-w-4xl text-white mb-6">
          Log Trades. Analyze Mistakes.{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Scale Consistency.
          </span>
        </h1>

        {/* Description */}
        <p className="text-slate-400 text-base sm:text-xl max-w-2xl mb-10 leading-relaxed">
          TradeMind combines smart journaling with advanced analytics, custom risk calculators, and automatic session indicators to turn your trade logs into scaling opportunities.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 w-full sm:w-auto">
          <button
            onClick={handleLaunchApp}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 text-white text-base font-bold shadow-xl shadow-indigo-600/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            Launch TradeMind
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-300 text-base font-bold hover:bg-slate-850 hover:text-white transition-all backdrop-blur-md flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-slate-300 text-slate-300" />
            Watch Demo
          </Link>
        </div>

        {/* Stats Preview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full border border-slate-800/40 bg-slate-950/20 backdrop-blur-md p-6 rounded-3xl shadow-2xl">
          <div className="p-4 flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">68.4%</span>
            <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase mt-1">Win Rate Peak</span>
          </div>
          <div className="p-4 border-l border-slate-900 flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-400 to-violet-500 bg-clip-text text-transparent">1:3.4</span>
            <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase mt-1">Average R:R</span>
          </div>
          <div className="p-4 border-l border-slate-900 flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-sky-500 bg-clip-text text-transparent">100%</span>
            <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase mt-1">Auto-Saved</span>
          </div>
          <div className="p-4 border-l border-slate-900 flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">AI Review</span>
            <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase mt-1">Instant Coaching</span>
          </div>
        </div>
      </main>

      {/* Feature Grid */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20 border-t border-slate-900/60 bg-[#08090d]/40">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">Engineered for Quantitative Success</h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
            No more manual spreadsheets. Log trade setups with automated parameters, session overlays, and detailed psychological tagging.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl border border-slate-800/40 bg-slate-950/20 hover:border-slate-800 transition-all shadow-lg flex flex-col items-start text-left">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 shadow-inner">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg text-slate-100 mb-2">Automated Parameters</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Detects Date, Time, Week, Month, and Year instantly. Computes session boundaries (London, New York, Asian, Overlap) and exact holding durations.
            </p>
          </div>

          <div className="p-8 rounded-3xl border border-slate-800/40 bg-slate-950/20 hover:border-slate-800 transition-all shadow-lg flex flex-col items-start text-left">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-6 shadow-inner">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg text-slate-100 mb-2">AI Review Coach</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Analyzes risk ratios, psychological states, and execution confluences. Generates recommendations and scores every trade out of 100.
            </p>
          </div>

          <div className="p-8 rounded-3xl border border-slate-800/40 bg-slate-950/20 hover:border-slate-800 transition-all shadow-lg flex flex-col items-start text-left">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6 shadow-inner">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg text-slate-100 mb-2">Portfolio Statistics</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Interactive charts for equity curves, daily PnL, drawdowns, session profitability, win rates, and streak counters.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} TradeMind AI. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-slate-300">Privacy Policy</a>
          <a href="#" className="hover:text-slate-300">Terms of Service</a>
          <a href="#" className="hover:text-slate-300">Support</a>
        </div>
      </footer>
    </div>
  );
}
