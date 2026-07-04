'use client';

import React from 'react';
import { Calendar, AlertTriangle, Clock, Globe } from 'lucide-react';

interface EconomicEvent {
  time: string;
  currency: string;
  event: string;
  importance: 'High' | 'Medium' | 'Low';
  actual?: string;
  forecast: string;
  previous: string;
}

export const EconomicCalendar: React.FC = () => {
  const events: EconomicEvent[] = [
    { time: '13:00', currency: 'GBP', event: 'BoE Interest Rate Decision', importance: 'High', forecast: '4.50%', previous: '4.25%' },
    { time: '14:30', currency: 'USD', event: 'Core CPI (MoM) (Jun)', importance: 'High', forecast: '0.2%', previous: '0.3%' },
    { time: '14:30', currency: 'USD', event: 'Unemployment Claims', importance: 'Medium', forecast: '220K', previous: '225K' },
    { time: '16:00', currency: 'USD', event: 'ISM Non-Manufacturing PMI', importance: 'High', forecast: '52.5', previous: '51.8' },
    { time: '18:15', currency: 'EUR', event: 'ECB President Lagarde Speaks', importance: 'Medium', forecast: '-', previous: '-' },
    { time: '20:30', currency: 'USD', event: 'FOMC Member Speech', importance: 'Low', forecast: '-', previous: '-' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-violet-400" />
            Economic Calendar
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">High volatility market events today</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
          <Globe className="w-3 h-3 text-slate-500" />
          <span>EST</span>
        </div>
      </div>

      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
        {events.map((ev, index) => {
          const impactColors = {
            High: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
            Medium: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
            Low: 'bg-slate-500/10 border-slate-500/20 text-slate-400'
          };
          
          return (
            <div 
              key={index}
              className="p-3 bg-slate-950/20 border border-slate-900/60 rounded-xl hover:border-slate-800 transition-colors flex items-center justify-between gap-3 text-xs"
            >
              {/* Event detail */}
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200">{ev.currency}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${impactColors[ev.importance]}`}>
                    {ev.importance}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] font-medium truncate">{ev.event}</p>
              </div>

              {/* Stats / Numbers */}
              <div className="flex items-center gap-4 text-right shrink-0">
                <div className="text-[10px] space-y-0.5">
                  <p className="text-slate-500">Fore: <span className="text-slate-300 font-medium">{ev.forecast}</span></p>
                  <p className="text-slate-500">Prev: <span className="text-slate-300">{ev.previous}</span></p>
                </div>
                
                <div className="flex items-center gap-1 text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-semibold text-slate-300 text-[10px]">{ev.time}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default EconomicCalendar;
