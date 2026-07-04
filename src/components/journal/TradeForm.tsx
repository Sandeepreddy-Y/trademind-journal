'use client';

import React, { useState, useEffect } from 'react';
import { useTrades } from '../../context/TradeContext';
import { uploadImage } from '../../lib/cloudinary';
import { Trade } from '../../types';
import { 
  Plus, 
  Upload, 
  Loader2, 
  DollarSign, 
  FileText, 
  BrainCircuit, 
  Camera, 
  Tag, 
  Trash2,
  X
} from 'lucide-react';

interface TradeFormProps {
  onClose: () => void;
  editTradeId?: string;
}

export const TradeForm: React.FC<TradeFormProps> = ({ onClose, editTradeId }) => {
  const { addTrade, updateTrade, trades } = useTrades();
  
  const [activeTab, setActiveTab] = useState<'core' | 'analysis' | 'psychology'>('core');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form Fields
  const [pair, setPair] = useState('EURUSD');
  const [direction, setDirection] = useState<'Buy' | 'Sell'>('Buy');
  const [lotSize, setLotSize] = useState<number>(0.1);
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [stopLoss, setStopLoss] = useState<number>(0);
  const [takeProfit, setTakeProfit] = useState<number>(0);
  const [exitPrice, setExitPrice] = useState<number>(0);
  const [commission, setCommission] = useState<number>(0);
  const [swap, setSwap] = useState<number>(0);
  const [riskPct, setRiskPct] = useState<number>(1);
  const [rewardPct, setRewardPct] = useState<number>(2);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));
  const [exitDate, setExitDate] = useState('');
  const [exitTime, setExitTime] = useState('');

  // Image Upload States
  const [beforeImage, setBeforeImage] = useState<string>('');
  const [afterImage, setAfterImage] = useState<string>('');
  const [tvImage, setTvImage] = useState<string>('');
  const [mt5Image, setMt5Image] = useState<string>('');

  // Technical Analysis
  const [strategy, setStrategy] = useState('');
  const [logic, setLogic] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [entryConfirmations, setEntryConfirmations] = useState<string[]>([]);

  // Psychology & Review
  const [emotion, setEmotion] = useState('Calm');
  const [confidence, setConfidence] = useState<number>(7);
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [lessons, setLessons] = useState('');
  const [improvement, setImprovement] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const confirmationOptions = [
    'Liquidity Sweep',
    'Break of Structure (BOS)',
    'Market Structure Shift (MSS)',
    'Order Block (OB)',
    'Fair Value Gap (FVG)',
    'Support & Resistance (S/R)',
    'SMC Setup',
    'ICT Setup',
    'News Catalyst'
  ];

  const mistakeOptions = [
    'Chased Price (FOMO)',
    'Overleveraged',
    'Exited Too Early',
    'Held Loss Too Long',
    'Moved Stop Loss',
    'Traded Against Trend',
    'Felt Impatient',
    'No Confirmation Entry',
    'None'
  ];

  // Load Trade data if editing
  useEffect(() => {
    if (editTradeId) {
      const editTrade = trades.find((t) => t.id === editTradeId);
      if (editTrade) {
        setPair(editTrade.pair);
        setDirection(editTrade.direction);
        setLotSize(editTrade.lotSize);
        setEntryPrice(editTrade.entryPrice);
        setStopLoss(editTrade.stopLoss);
        setTakeProfit(editTrade.takeProfit);
        setExitPrice(editTrade.exitPrice);
        setCommission(editTrade.commission || 0);
        setSwap(editTrade.swap || 0);
        setRiskPct(editTrade.riskPct || 1);
        setRewardPct(editTrade.rewardPct || 2);
        setDate(editTrade.date);
        setTime(editTrade.time);
        
        // Split exit parameters if they exist or estimate
        setExitDate(editTrade.date);
        setExitTime(editTrade.time);
        
        setBeforeImage(editTrade.beforeImage || '');
        setAfterImage(editTrade.afterImage || '');
        setTvImage(editTrade.tvImage || '');
        setMt5Image(editTrade.mt5Image || '');
        
        setStrategy(editTrade.strategy || '');
        setLogic(editTrade.logic || '');
        setReason(editTrade.reason || '');
        setNotes(editTrade.notes || '');
        setEntryConfirmations(editTrade.entryConfirmations || []);
        
        setEmotion(editTrade.emotion || 'Calm');
        setConfidence(editTrade.confidence || 7);
        setMistakes(editTrade.mistakes || []);
        setLessons(editTrade.lessons || '');
        setImprovement(editTrade.improvement || '');
        setTagsInput(editTrade.tags?.join(', ') || '');
      }
    }
  }, [editTradeId, trades]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after' | 'tv' | 'mt5') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const url = await uploadImage(file);
      if (type === 'before') setBeforeImage(url);
      else if (type === 'after') setAfterImage(url);
      else if (type === 'tv') setTvImage(url);
      else if (type === 'mt5') setMt5Image(url);
    } catch (e: any) {
      console.error(e);
      setError('Image upload failed. Storing image as preview data URL.');
    } finally {
      setLoading(false);
    }
  };

  const toggleConfirmation = (conf: string) => {
    setEntryConfirmations((prev) =>
      prev.includes(conf) ? prev.filter((c) => c !== conf) : [...prev, conf]
    );
  };

  const toggleMistake = (mistake: string) => {
    if (mistake === 'None') {
      setMistakes(['None']);
      return;
    }
    setMistakes((prev) => {
      const filtered = prev.filter((m) => m !== 'None');
      return filtered.includes(mistake)
        ? filtered.filter((m) => m !== mistake)
        : [...filtered, mistake];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t !== '');

    const tradeData: any = {
      pair,
      direction,
      lotSize: Number(lotSize),
      entryPrice: Number(entryPrice),
      stopLoss: Number(stopLoss),
      takeProfit: Number(takeProfit),
      exitPrice: Number(exitPrice),
      commission: Number(commission),
      swap: Number(swap),
      riskPct: Number(riskPct),
      rewardPct: Number(rewardPct),
      date,
      time,
      beforeImage,
      afterImage,
      tvImage,
      mt5Image,
      strategy,
      logic,
      reason,
      notes,
      entryConfirmations,
      emotion,
      confidence: Number(confidence),
      mistakes,
      lessons,
      improvement,
      tags: parsedTags,
    };

    try {
      if (editTradeId) {
        await updateTrade(
          editTradeId, 
          tradeData, 
          exitPrice > 0 ? (exitDate || date) : '', 
          exitPrice > 0 ? (exitTime || time) : ''
        );
      } else {
        await addTrade(
          tradeData, 
          exitPrice > 0 ? (exitDate || date) : '', 
          exitPrice > 0 ? (exitTime || time) : ''
        );
      }
      onClose();
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to save trade log');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-sm">
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-800/40 p-1 bg-slate-950/40 rounded-2xl">
        <button
          onClick={() => setActiveTab('core')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'core'
              ? 'bg-[#141620] text-indigo-400 border border-slate-850 shadow-inner'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Core Fields
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'analysis'
              ? 'bg-[#141620] text-indigo-400 border border-slate-850 shadow-inner'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Setup & Logic
        </button>
        <button
          onClick={() => setActiveTab('psychology')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'psychology'
              ? 'bg-[#141620] text-indigo-400 border border-slate-850 shadow-inner'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BrainCircuit className="w-4 h-4" />
          Psychology & Media
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* TAB 1: CORE PARAMETERS */}
        {activeTab === 'core' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Pair */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Trade Pair</label>
                <input
                  type="text"
                  required
                  value={pair}
                  onChange={(e) => setPair(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:outline-none focus:border-indigo-500/60 text-slate-200"
                />
              </div>

              {/* Direction */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Direction</label>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as 'Buy' | 'Sell')}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:outline-none focus:border-indigo-500/60 text-slate-200"
                >
                  <option value="Buy">BUY</option>
                  <option value="Sell">SELL</option>
                </select>
              </div>

              {/* Lot Size */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Lot Size</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={lotSize}
                  onChange={(e) => setLotSize(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:outline-none focus:border-indigo-500/60 text-slate-200"
                />
              </div>

              {/* Entry Price */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Entry Price</label>
                <input
                  type="number"
                  step="0.00001"
                  required
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:outline-none focus:border-indigo-500/60 text-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Stop Loss */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Stop Loss (SL)</label>
                <input
                  type="number"
                  step="0.00001"
                  required
                  value={stopLoss}
                  onChange={(e) => setStopLoss(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:outline-none focus:border-indigo-500/60 text-slate-200"
                />
              </div>

              {/* Take Profit */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Take Profit (TP)</label>
                <input
                  type="number"
                  step="0.00001"
                  required
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:outline-none focus:border-indigo-500/60 text-slate-200"
                />
              </div>

              {/* Exit Price */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Exit Price (0 if open)</label>
                <input
                  type="number"
                  step="0.00001"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:outline-none focus:border-indigo-500/60 text-slate-200"
                />
              </div>

              {/* Commission */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Commission ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={commission}
                  onChange={(e) => setCommission(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:outline-none focus:border-indigo-500/60 text-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Swap */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Swap ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={swap}
                  onChange={(e) => setSwap(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:outline-none focus:border-indigo-500/60 text-slate-200"
                />
              </div>

              {/* Risk % */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Risk %</label>
                <input
                  type="number"
                  step="0.1"
                  value={riskPct}
                  onChange={(e) => setRiskPct(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:outline-none focus:border-indigo-500/60 text-slate-200"
                />
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Entry Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:outline-none focus:border-indigo-500/60 text-slate-200"
                />
              </div>

              {/* Time */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Entry Time</label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:outline-none focus:border-indigo-500/60 text-slate-200"
                />
              </div>
            </div>

            {exitPrice > 0 && (
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/40 border border-slate-900">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Exit Date</label>
                  <input
                    type="date"
                    value={exitDate}
                    onChange={(e) => setExitDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-900 focus:outline-none focus:border-indigo-500/60 text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Exit Time</label>
                  <input
                    type="time"
                    value={exitTime}
                    onChange={(e) => setExitTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-900 focus:outline-none focus:border-indigo-500/60 text-slate-200"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TECHNICAL ANALYSIS */}
        {activeTab === 'analysis' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Strategy Name</label>
                <input
                  type="text"
                  placeholder="e.g. SMC Reversal, Range Breakout"
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:outline-none focus:border-indigo-500/60 text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Setup / Core Logic</label>
                <input
                  type="text"
                  placeholder="e.g. FVG Mitigation, HTF Sweep"
                  value={logic}
                  onChange={(e) => setLogic(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:outline-none focus:border-indigo-500/60 text-slate-200"
                />
              </div>
            </div>

            {/* Entry Confirmations (Checkboxes) */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">Entry Confirmations</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {confirmationOptions.map((conf) => (
                  <div
                    key={conf}
                    onClick={() => toggleConfirmation(conf)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-[11px] font-semibold cursor-pointer transition-all duration-200 ${
                      entryConfirmations.includes(conf)
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                        : 'bg-slate-950/30 border-slate-900 text-slate-400 hover:bg-slate-950/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={entryConfirmations.includes(conf)}
                      readOnly
                      className="hidden"
                    />
                    <span>{conf}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Text fields */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Reason for Entry</label>
                <textarea
                  rows={2}
                  placeholder="Why are you taking this trade? Describe what you see."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:outline-none focus:border-indigo-500/60 text-slate-200 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Detailed Notes & Observations</label>
                <textarea
                  rows={3}
                  placeholder="Add details about price action, correlations, news event effects, or management notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:outline-none focus:border-indigo-500/60 text-slate-200 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PSYCHOLOGY, TAGS & IMAGES */}
        {activeTab === 'psychology' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Emotion Select */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Trading State / Emotion</label>
                <select
                  value={emotion}
                  onChange={(e) => setEmotion(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:outline-none focus:border-indigo-500/60 text-slate-200 text-xs"
                >
                  <option value="Calm">Calm & Objective</option>
                  <option value="FOMO">FOMO (Fear of Missing Out)</option>
                  <option value="Greed">Greed (Over-leveraged)</option>
                  <option value="Fear">Fearful / Hesitant</option>
                  <option value="Anxious">Anxious / Nervous</option>
                  <option value="Revenge">Revenge Trading</option>
                  <option value="Overconfident">Overconfident</option>
                </select>
              </div>

              {/* Confidence Level (Slider) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  <span>Confidence Level</span>
                  <span className="text-indigo-400 font-bold">{confidence} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={confidence}
                  onChange={(e) => setConfidence(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>

            {/* Mistakes Selection */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">Identified Mistakes</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {mistakeOptions.map((m) => (
                  <div
                    key={m}
                    onClick={() => toggleMistake(m)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-[11px] font-semibold cursor-pointer transition-all duration-200 ${
                      mistakes.includes(m)
                        ? 'bg-rose-500/10 border-rose-500/35 text-rose-400'
                        : 'bg-slate-950/30 border-slate-900 text-slate-400 hover:bg-slate-950/50'
                    }`}
                  >
                    <span>{m}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Lessons Learned</label>
                <textarea
                  rows={2}
                  placeholder="What did this trade teach you?"
                  value={lessons}
                  onChange={(e) => setLessons(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:outline-none focus:border-indigo-500/60 text-slate-200 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Improvement Notes</label>
                <textarea
                  rows={2}
                  placeholder="What will you do differently next time?"
                  value={improvement}
                  onChange={(e) => setImprovement(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:outline-none focus:border-indigo-500/60 text-slate-200 text-xs"
                />
              </div>
            </div>

            {/* Custom tags */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Custom Tags (comma separated)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Tag className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="SMC, Breakout, News, Scalp"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:outline-none focus:border-indigo-500/60 text-slate-200 text-xs"
                />
              </div>
            </div>

            {/* Image Uploaders */}
            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">Screenshots / Charts</label>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Before Screenshot */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-500 block">Before Entry</span>
                  {beforeImage ? (
                    <div className="relative h-20 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 group">
                      <img src={beforeImage} alt="Before Entry" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setBeforeImage('')}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-500 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="h-20 rounded-xl border border-dashed border-slate-800 hover:border-indigo-500/40 flex flex-col items-center justify-center cursor-pointer text-slate-500 hover:text-slate-300 transition-colors">
                      <Camera className="w-4 h-4 mb-1" />
                      <span className="text-[9px] font-bold">Attach File</span>
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'before')} className="hidden" />
                    </label>
                  )}
                </div>

                {/* After Screenshot */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-500 block">After Exit</span>
                  {afterImage ? (
                    <div className="relative h-20 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 group">
                      <img src={afterImage} alt="After Exit" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setAfterImage('')}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-500 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="h-20 rounded-xl border border-dashed border-slate-800 hover:border-indigo-500/40 flex flex-col items-center justify-center cursor-pointer text-slate-500 hover:text-slate-300 transition-colors">
                      <Camera className="w-4 h-4 mb-1" />
                      <span className="text-[9px] font-bold">Attach File</span>
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'after')} className="hidden" />
                    </label>
                  )}
                </div>

                {/* TV Screenshot */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-500 block">TradingView Chart</span>
                  {tvImage ? (
                    <div className="relative h-20 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 group">
                      <img src={tvImage} alt="TradingView Chart" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setTvImage('')}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-500 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="h-20 rounded-xl border border-dashed border-slate-800 hover:border-indigo-500/40 flex flex-col items-center justify-center cursor-pointer text-slate-500 hover:text-slate-300 transition-colors">
                      <Upload className="w-4 h-4 mb-1" />
                      <span className="text-[9px] font-bold">Attach TV</span>
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'tv')} className="hidden" />
                    </label>
                  )}
                </div>

                {/* MT5 Screenshot */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-500 block">MT5 Execution</span>
                  {mt5Image ? (
                    <div className="relative h-20 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 group">
                      <img src={mt5Image} alt="MT5 Screenshot" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setMt5Image('')}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-500 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="h-20 rounded-xl border border-dashed border-slate-800 hover:border-indigo-500/40 flex flex-col items-center justify-center cursor-pointer text-slate-500 hover:text-slate-300 transition-colors">
                      <Upload className="w-4 h-4 mb-1" />
                      <span className="text-[9px] font-bold">Attach MT5</span>
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'mt5')} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Buttons Panel */}
        <div className="flex gap-3 justify-end border-t border-slate-800/40 pt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-xs font-semibold uppercase tracking-wider"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white transition-all flex items-center gap-2 cursor-pointer font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/15"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {editTradeId ? 'Update Log' : 'Save Trade'}
          </button>
        </div>
      </form>
    </div>
  );
};
export default TradeForm;
