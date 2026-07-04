'use client';

import React, { useState } from 'react';
import { useTrades } from '../../context/TradeContext';
import { CheckSquare, Square, Check, RefreshCw } from 'lucide-react';

export const Checklist: React.FC = () => {
  const { settings } = useTrades();
  
  const checklistItems = settings?.tradingChecklist || [
    'HTF bias identified',
    'Liquidity sweep observed',
    'MSS / BOS confirmed on LTF',
    'FVG / Order block entry point set',
    'Risk/Reward ratio is 1:2 or higher',
    'High-impact news checked'
  ];

  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});

  const toggleItem = (item: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const resetChecklist = () => {
    setCheckedItems({});
  };

  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const progressPct = checklistItems.length > 0 
    ? Math.round((checkedCount / checklistItems.length) * 100) 
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-200">Pre-Trade Checklist</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">Enforce discipline before executing</p>
        </div>
        <button
          onClick={resetChecklist}
          className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 hover:text-indigo-400 hover:border-indigo-500/20 transition-all text-xs flex items-center gap-1 cursor-pointer"
          title="Reset Checklist"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
          <span>Confluence Status</span>
          <span className={`${progressPct === 100 ? 'text-emerald-400' : 'text-indigo-400'}`}>
            {progressPct}% Ready
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
          <div
            className={`h-full transition-all duration-300 rounded-full bg-gradient-to-r ${
              progressPct === 100 
                ? 'from-emerald-500 to-green-500 shadow-lg shadow-emerald-500/20' 
                : 'from-indigo-500 to-violet-600'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Items list */}
      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
        {checklistItems.map((item, index) => {
          const isChecked = !!checkedItems[item];
          return (
            <div
              key={index}
              onClick={() => toggleItem(item)}
              className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all duration-200 ${
                isChecked
                  ? 'bg-indigo-500/5 border-indigo-500/20 text-indigo-200'
                  : 'bg-slate-950/20 border-slate-900/60 text-slate-400 hover:bg-slate-950/40 hover:border-slate-800'
              }`}
            >
              <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                isChecked
                  ? 'bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                  : 'border-slate-700 bg-slate-900'
              }`}>
                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <span className={`flex-1 transition-all ${isChecked ? 'line-through text-slate-500' : ''}`}>
                {item}
              </span>
            </div>
          );
        })}
      </div>

      {progressPct === 100 && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold text-center uppercase tracking-wider animate-pulse">
          ✓ Invalidation Criteria Met. Trade approved.
        </div>
      )}
    </div>
  );
};
export default Checklist;
