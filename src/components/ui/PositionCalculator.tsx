'use client';

import React, { useState, useEffect } from 'react';
import { Calculator, HelpCircle, DollarSign } from 'lucide-react';

export const PositionCalculator: React.FC = () => {
  const [balance, setBalance] = useState<number>(10000);
  const [riskPct, setRiskPct] = useState<number>(1);
  const [stopLossPips, setStopLossPips] = useState<number>(15);
  const [pipValue, setPipValue] = useState<number>(10); // Standard Forex Pip value ($10 for standard lot)
  const [assetType, setAssetType] = useState<string>('forex');

  // Outputs
  const [cashRisk, setCashRisk] = useState<number>(100);
  const [lotSize, setLotSize] = useState<number>(0.67);

  useEffect(() => {
    // Determine standard pip multiplier or value based on selection
    let calculatedPipVal = pipValue;
    if (assetType === 'forex') {
      calculatedPipVal = 10; // $10 per pip on EURUSD 1 lot
    } else if (assetType === 'indices') {
      calculatedPipVal = 1.0; // $1 per point
    } else if (assetType === 'crypto') {
      calculatedPipVal = 1.0; // $1 per point
    }

    const calculatedRisk = (balance * riskPct) / 100;
    setCashRisk(calculatedRisk);

    let calculatedLots = 0;
    if (stopLossPips > 0 && calculatedPipVal > 0) {
      calculatedLots = calculatedRisk / (stopLossPips * calculatedPipVal);
    }
    setLotSize(Number(calculatedLots.toFixed(2)));
  }, [balance, riskPct, stopLossPips, pipValue, assetType]);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
          <Calculator className="w-4 h-4 text-indigo-400" />
          Position Size Calculator
        </h4>
        <p className="text-[11px] text-slate-500 mt-0.5">Determine lot size based on risk parameters</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Account Balance */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Account Balance ($)</label>
          <input
            type="number"
            value={balance}
            onChange={(e) => setBalance(Math.max(0, Number(e.target.value)))}
            className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-900 text-slate-200 focus:outline-none focus:border-indigo-500/60"
          />
        </div>

        {/* Risk Percentage */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Risk %</label>
          <input
            type="number"
            step="0.1"
            value={riskPct}
            onChange={(e) => setRiskPct(Math.max(0, Number(e.target.value)))}
            className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-900 text-slate-200 focus:outline-none focus:border-indigo-500/60"
          />
        </div>

        {/* Stop Loss Pips */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Stop Loss (Pips/Pts)</label>
          <input
            type="number"
            value={stopLossPips}
            onChange={(e) => setStopLossPips(Math.max(0.1, Number(e.target.value)))}
            className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-900 text-slate-200 focus:outline-none focus:border-indigo-500/60"
          />
        </div>

        {/* Asset Type */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Asset Type</label>
          <select
            value={assetType}
            onChange={(e) => setAssetType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-900 text-slate-200 focus:outline-none focus:border-indigo-500/60 text-xs"
          >
            <option value="forex">Forex (Standard Lot)</option>
            <option value="indices">Indices ($1/pt)</option>
            <option value="crypto">Crypto ($1/pt)</option>
            <option value="custom">Custom Pip Value</option>
          </select>
        </div>
      </div>

      {assetType === 'custom' && (
        <div className="space-y-1 text-xs">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Pip Value per Standard Lot ($)</label>
          <input
            type="number"
            value={pipValue}
            onChange={(e) => setPipValue(Math.max(0.1, Number(e.target.value)))}
            className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-900 text-slate-200 focus:outline-none focus:border-indigo-500/60"
          />
        </div>
      )}

      {/* Results Box */}
      <div className="p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 grid grid-cols-2 gap-4">
        <div>
          <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest block">Cash at Risk</span>
          <span className="text-base font-bold text-slate-100 flex items-center gap-0.5 mt-0.5">
            <DollarSign className="w-4 h-4 text-slate-400" />
            {cashRisk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="border-l border-slate-900 pl-4">
          <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest block">Recommended Size</span>
          <span className="text-base font-bold text-slate-100 block mt-0.5">
            {lotSize} {assetType === 'forex' ? 'Lots' : 'Units'}
          </span>
        </div>
      </div>
    </div>
  );
};
export default PositionCalculator;
