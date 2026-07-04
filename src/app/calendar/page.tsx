'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTrades } from '../../context/TradeContext';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/layout/Sidebar';
import Card from '../../components/ui/Card';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Award } from 'lucide-react';

export default function CalendarView() {
  const { user, loading: authLoading } = useAuth();
  const { trades, loading: tradesLoading } = useTrades();
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || tradesLoading || !user) {
    return (
      <div className="min-h-screen bg-[#06070a] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest animate-pulse">Drawing Calendar...</p>
      </div>
    );
  }

  // --- CALENDAR GENERATION MATHEMATICS ---
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const prevMonthDays = new Date(year, month, 0).getDate();
  
  const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // 1. Previous Month Padding Cells
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const dayVal = prevMonthDays - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayVal).padStart(2, '0')}`;
    cells.push({ dateStr, dayNum: dayVal, isCurrentMonth: false });
  }

  // 2. Current Month Cells
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    cells.push({ dateStr, dayNum: i, isCurrentMonth: true });
  }

  // 3. Next Month Padding Cells
  const remainingCells = 42 - cells.length; // standard 6-row calendar
  for (let i = 1; i <= remainingCells; i++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    cells.push({ dateStr, dayNum: i, isCurrentMonth: false });
  }

  // Group trades by date YYYY-MM-DD
  const tradesByDate: { [dateStr: string]: typeof trades } = {};
  trades.forEach(t => {
    const dateStr = t.date;
    if (!tradesByDate[dateStr]) {
      tradesByDate[dateStr] = [];
    }
    tradesByDate[dateStr].push(t);
  });

  const nextMonthHandler = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const prevMonthHandler = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex min-h-screen bg-[#07080c] text-slate-100 pl-0 md:pl-64">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Container */}
      <main className="flex-1 px-6 py-8 mt-16 md:mt-0 space-y-6 max-w-7xl mx-auto w-full relative z-10">
        
        {/* Header and Controls */}
        <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-indigo-400" />
              Calendar View
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Timeline view of daily performance and streak confluences.
            </p>
          </div>

          {/* Nav Controls */}
          <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800/80 px-4 py-2 rounded-xl">
            <button 
              onClick={prevMonthHandler}
              className="p-1 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold text-slate-250 w-28 text-center uppercase tracking-widest font-display">
              {monthNames[month]} {year}
            </span>
            <button 
              onClick={nextMonthHandler}
              className="p-1 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* --- CALENDAR GRID BOARD --- */}
        <section className="glass-panel p-6 rounded-3xl border border-slate-900/60 shadow-2xl">
          <div className="grid grid-cols-7 gap-3">
            {/* Days Grid Header */}
            {daysOfWeek.map((day) => (
              <span key={day} className="text-[10px] font-bold text-slate-500 text-center uppercase tracking-wider pb-3 border-b border-slate-900">
                {day}
              </span>
            ))}

            {/* Calendar Cells */}
            {cells.map((cell, idx) => {
              const dayTrades = tradesByDate[cell.dateStr] || [];
              const closedTrades = dayTrades.filter(t => t.status !== 'Open');
              const dailyPnl = closedTrades.reduce((sum, t) => sum + t.pnl, 0);

              const hasTrades = dayTrades.length > 0;
              const isProfit = dailyPnl > 0;
              const isLoss = dailyPnl < 0;

              return (
                <div
                  key={idx}
                  className={`min-h-[100px] p-2.5 rounded-2xl border transition-all flex flex-col justify-between ${
                    cell.isCurrentMonth
                      ? 'bg-slate-950/20 border-slate-900/60'
                      : 'bg-slate-950/5 border-slate-950/20 opacity-30 pointer-events-none'
                  } ${
                    hasTrades 
                      ? (isProfit 
                          ? 'border-emerald-500/20 bg-emerald-500/[0.01]' 
                          : isLoss 
                            ? 'border-rose-500/20 bg-rose-500/[0.01]' 
                            : 'border-slate-800 bg-slate-800/[0.01]')
                      : ''
                  }`}
                >
                  {/* Day Number */}
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-bold ${
                      cell.isCurrentMonth ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      {cell.dayNum}
                    </span>
                    {hasTrades && (
                      <span className="text-[8px] bg-slate-900 border border-slate-800/80 text-slate-450 px-1.5 py-0.5 rounded font-bold uppercase">
                        {dayTrades.length} L
                      </span>
                    )}
                  </div>

                  {/* Daily PnL summary / Trades dots */}
                  {hasTrades && (
                    <div className="space-y-1.5 mt-2">
                      {/* PnL value */}
                      {closedTrades.length > 0 && (
                        <span className={`text-[10px] font-extrabold block leading-none ${
                          isProfit ? 'text-win' : isLoss ? 'text-loss' : 'text-be'
                        }`}>
                          {isProfit ? '+' : ''}${dailyPnl.toFixed(2)}
                        </span>
                      )}

                      {/* Small trade labels */}
                      <div className="space-y-1">
                        {dayTrades.slice(0, 2).map((t) => (
                          <div 
                            key={t.id} 
                            onClick={() => router.push('/journal')}
                            className={`px-1.5 py-0.5 rounded border text-[8px] font-bold flex items-center justify-between cursor-pointer truncate ${
                              t.status === 'Win' 
                                ? 'bg-win-light text-win border-emerald-500/10' 
                                : t.status === 'Loss' 
                                  ? 'bg-loss-light text-loss border-rose-500/10' 
                                  : t.status === 'Open'
                                    ? 'bg-open-light text-open border-blue-500/10'
                                    : 'bg-be-light text-be border-slate-700/20'
                            }`}
                          >
                            <span>{t.pair}</span>
                            <span>{t.direction}</span>
                          </div>
                        ))}
                        {dayTrades.length > 2 && (
                          <span className="text-[8px] text-slate-500 font-semibold block text-center">
                            + {dayTrades.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {!hasTrades && <div />}
                </div>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}
