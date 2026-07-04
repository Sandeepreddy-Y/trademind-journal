'use client';

import React from 'react';
import { Trade } from '../../types';

interface CalendarHeatmapProps {
  trades: Trade[];
}

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({ trades }) => {
  // Get date range: last 28 days (4 weeks)
  const today = new Date();
  const dateList: Date[] = [];
  
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    dateList.push(d);
  }

  // Group trades by YYYY-MM-DD
  const pnlByDate: { [dateStr: string]: { pnl: number; count: number } } = {};
  trades.forEach(t => {
    const dateStr = t.date; // YYYY-MM-DD
    if (!pnlByDate[dateStr]) {
      pnlByDate[dateStr] = { pnl: 0, count: 0 };
    }
    pnlByDate[dateStr].pnl += t.pnl;
    pnlByDate[dateStr].count += 1;
  });

  const getHeatmapColor = (pnl: number, count: number) => {
    if (count === 0) return 'bg-slate-900 border-slate-800/60 hover:bg-slate-800/40';
    if (pnl > 100) return 'bg-emerald-500/80 border-emerald-500/30 hover:bg-emerald-400';
    if (pnl > 0) return 'bg-emerald-600/40 border-emerald-600/20 hover:bg-emerald-500/60';
    if (pnl < -100) return 'bg-rose-500/80 border-rose-500/30 hover:bg-rose-400';
    return 'bg-rose-600/40 border-rose-600/20 hover:bg-rose-500/60';
  };

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-200">Daily Performance Heatmap</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">Last 4 weeks of trading activity</p>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-semibold">
          <span>Loss</span>
          <div className="w-2.5 h-2.5 rounded bg-rose-500/70 border border-rose-500/20"></div>
          <div className="w-2.5 h-2.5 rounded bg-rose-600/30 border border-rose-600/20"></div>
          <div className="w-2.5 h-2.5 rounded bg-slate-900 border border-slate-800"></div>
          <div className="w-2.5 h-2.5 rounded bg-emerald-600/30 border border-emerald-600/20"></div>
          <div className="w-2.5 h-2.5 rounded bg-emerald-500/70 border border-emerald-500/20"></div>
          <span>Profit</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2.5 pt-2">
        {/* Header: Sun - Sat */}
        {daysOfWeek.map(day => (
          <span key={day} className="text-[9px] font-bold text-slate-500 text-center uppercase tracking-wider">
            {day}
          </span>
        ))}

        {/* Heatmap Cells */}
        {dateList.map((date, idx) => {
          const dateStr = date.toISOString().split('T')[0];
          const activity = pnlByDate[dateStr] || { pnl: 0, count: 0 };
          const cellColor = getHeatmapColor(activity.pnl, activity.count);

          const dayLabel = date.getDate();
          const monthLabel = date.toLocaleString('default', { month: 'short' });
          const yearLabel = date.getFullYear();

          const tooltipText = activity.count > 0
            ? `${monthLabel} ${dayLabel}, ${yearLabel}: ${activity.count} trade(s) | PnL: ${activity.pnl >= 0 ? '+' : ''}$${activity.pnl.toFixed(2)}`
            : `${monthLabel} ${dayLabel}, ${yearLabel}: No trades`;

          return (
            <div
              key={idx}
              className={`heatmap-cell h-9 flex flex-col items-center justify-center border rounded-xl relative group transition-all duration-200 cursor-pointer ${cellColor}`}
            >
              <span className="text-[10px] font-semibold text-slate-300 pointer-events-none">{dayLabel}</span>
              
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block w-48 bg-slate-950/95 border border-slate-800 text-[10px] font-semibold text-slate-200 p-2.5 rounded-xl text-center shadow-xl z-50 pointer-events-none">
                {tooltipText}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default CalendarHeatmap;
