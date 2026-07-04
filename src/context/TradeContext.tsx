'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Trade, UserSettings, TradingGoal } from '../types';
import * as dbService from '../lib/db';
import { enrichTradeFields } from '../utils/tradeUtils';

interface TradeContextType {
  trades: Trade[];
  settings: UserSettings | null;
  goals: TradingGoal[];
  loading: boolean;
  addTrade: (
    tradeData: Omit<Trade, 'id' | 'userId' | 'day' | 'week' | 'month' | 'year' | 'session' | 'holdingTime' | 'rr' | 'pnl' | 'status' | 'createdAt'>,
    exitDate: string,
    exitTime: string
  ) => Promise<void>;
  updateTrade: (
    tradeId: string,
    updatedData: Partial<Trade>,
    exitDate?: string,
    exitTime?: string
  ) => Promise<void>;
  deleteTrade: (tradeId: string) => Promise<void>;
  updateSettings: (newSettings: UserSettings) => Promise<void>;
  addGoal: (goal: Omit<TradingGoal, 'id' | 'current' | 'completed'>) => Promise<void>;
  updateGoal: (goalId: string, updatedFields: Partial<TradingGoal>) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  importMT5Trades: () => Promise<{ imported: number; skipped: number }>;
}

const TradeContext = createContext<TradeContextType | undefined>(undefined);

export const TradeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [goals, setGoals] = useState<TradingGoal[]>([]);
  const [loading, setLoading] = useState(true);

  // Load user data on authentication state change
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        setTrades([]);
        setSettings(null);
        setGoals([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [userTrades, userSettings, userGoals] = await Promise.all([
          dbService.getTrades(user.uid),
          dbService.getSettings(user.uid),
          dbService.getGoals(user.uid),
        ]);
        setTrades(userTrades);
        setSettings(userSettings);
        setGoals(userGoals);
      } catch (e) {
        console.error('Error loading trade context data:', e);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  const addTrade = async (
    tradeData: Omit<Trade, 'id' | 'userId' | 'day' | 'week' | 'month' | 'year' | 'session' | 'holdingTime' | 'rr' | 'pnl' | 'status' | 'createdAt'>,
    exitDate: string,
    exitTime: string
  ) => {
    if (!user) throw new Error('Authentication required');

    const tradeId = 'trade_' + Math.random().toString(36).substr(2, 9);
    
    // Enrich with auto fields
    const enriched = enrichTradeFields(
      {
        ...tradeData,
        id: tradeId,
        userId: user.uid,
        createdAt: Date.now(),
      } as Trade,
      exitDate,
      exitTime
    );

    await dbService.saveTrade(enriched);
    
    setTrades((prev) => [enriched, ...prev]);
  };

  const updateTrade = async (
    tradeId: string,
    updatedData: Partial<Trade>,
    exitDate?: string,
    exitTime?: string
  ) => {
    if (!user) throw new Error('Authentication required');

    const existing = trades.find((t) => t.id === tradeId);
    if (!existing) throw new Error('Trade not found');

    const merged = { ...existing, ...updatedData } as Trade;
    
    // If exitDate/exitTime or prices were updated, re-enrich
    let finalTrade = merged;
    if (exitDate !== undefined || exitTime !== undefined || updatedData.entryPrice !== undefined || updatedData.exitPrice !== undefined || updatedData.stopLoss !== undefined || updatedData.takeProfit !== undefined) {
      const eDate = exitDate !== undefined ? exitDate : (existing.date || ''); // fallback
      const eTime = exitTime !== undefined ? exitTime : (existing.time || ''); // fallback
      finalTrade = enrichTradeFields(merged, eDate, eTime);
    }

    await dbService.saveTrade(finalTrade);

    setTrades((prev) =>
      prev.map((t) => (t.id === tradeId ? finalTrade : t))
    );
  };

  const deleteTrade = async (tradeId: string) => {
    if (!user) throw new Error('Authentication required');

    await dbService.deleteTrade(user.uid, tradeId);
    setTrades((prev) => prev.filter((t) => t.id !== tradeId));
  };

  const updateSettings = async (newSettings: UserSettings) => {
    if (!user) throw new Error('Authentication required');

    await dbService.saveSettings(user.uid, newSettings);
    setSettings(newSettings);
  };

  const addGoal = async (goalData: Omit<TradingGoal, 'id' | 'current' | 'completed'>) => {
    if (!user) throw new Error('Authentication required');

    const goalId = 'goal_' + Math.random().toString(36).substr(2, 9);
    const newGoal: TradingGoal = {
      ...goalData,
      id: goalId,
      current: 0,
      completed: false,
    };

    await dbService.saveGoal(user.uid, newGoal);
    setGoals((prev) => [...prev, newGoal]);
  };

  const updateGoal = async (goalId: string, updatedFields: Partial<TradingGoal>) => {
    if (!user) throw new Error('Authentication required');

    const existing = goals.find((g) => g.id === goalId);
    if (!existing) throw new Error('Goal not found');

    const updated = { ...existing, ...updatedFields } as TradingGoal;
    
    // Auto complete check
    if (updated.current >= updated.target) {
      updated.completed = true;
    } else {
      updated.completed = false;
    }

    await dbService.saveGoal(user.uid, updated);
    setGoals((prev) => prev.map((g) => (g.id === goalId ? updated : g)));
  };

  const deleteGoal = async (goalId: string) => {
    if (!user) throw new Error('Authentication required');

    await dbService.deleteGoal(user.uid, goalId);
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
  };

  const importMT5Trades = async (): Promise<{ imported: number; skipped: number }> => {
    if (!user) throw new Error('Authentication required');

    // Fetch buffered trades from the sync API
    const res = await fetch('/api/sync-trades');
    const data = await res.json();

    if (!data.trades || data.trades.length === 0) {
      return { imported: 0, skipped: 0 };
    }

    const existingTradesMap = new Map(trades.map((t) => [t.id, t]));
    let imported = 0;
    let skipped = 0;

    for (const mt5Trade of data.trades) {
      const existing = existingTradesMap.get(mt5Trade.id);

      if (existing) {
        // If the trade in the local DB is already closed/finalized, we skip it
        const isExistingOpen = existing.status === 'Open';
        const isNewOpen = mt5Trade.status === 'Open';
        const pnlChanged = existing.pnl !== mt5Trade.pnl;
        const exitPriceChanged = existing.exitPrice !== mt5Trade.exitPrice;

        const shouldUpdate = isExistingOpen && (!isNewOpen || pnlChanged || exitPriceChanged);

        if (!shouldUpdate) {
          skipped++;
          continue;
        }
      }

      // Override userId with the authenticated user and preserve manual updates
      const trade: Trade = {
        ...mt5Trade,
        userId: user.uid,
        stopLoss: existing?.stopLoss || mt5Trade.stopLoss || 0,
        takeProfit: existing?.takeProfit || mt5Trade.takeProfit || 0,
        riskPct: existing?.riskPct || mt5Trade.riskPct || 0,
        rewardPct: existing?.rewardPct || mt5Trade.rewardPct || 0,
        notes: existing?.notes || mt5Trade.notes || (mt5Trade.exitPrice > 0 ? `MT5 Position #${mt5Trade.positionId} — Auto-imported` : `MT5 Position #${mt5Trade.positionId} — Running Open Position`),
        reason: existing?.reason || mt5Trade.reason || 'MT5 Auto Import',
        logic: existing?.logic || mt5Trade.logic || '',
        entryConfirmations: existing?.entryConfirmations || mt5Trade.entryConfirmations || [],
        emotion: existing?.emotion || mt5Trade.emotion || '',
        confidence: existing?.confidence || mt5Trade.confidence || 5,
        mistakes: existing?.mistakes || mt5Trade.mistakes || [],
        lessons: existing?.lessons || mt5Trade.lessons || '',
        improvement: existing?.improvement || mt5Trade.improvement || '',
        tags: existing?.tags || mt5Trade.tags || ['mt5-import'],
        strategy: existing?.strategy || mt5Trade.strategy || 'MT5 Sync',
      };

      await dbService.saveTrade(trade);
      imported++;
    }

    // Reload all trades to get the updated list
    const updatedTrades = await dbService.getTrades(user.uid);
    setTrades(updatedTrades);

    // Clear the server buffer
    await fetch('/api/sync-trades', { method: 'DELETE' });

    return { imported, skipped };
  };

  return (
    <TradeContext.Provider
      value={{
        trades,
        settings,
        goals,
        loading,
        addTrade,
        updateTrade,
        deleteTrade,
        updateSettings,
        addGoal,
        updateGoal,
        deleteGoal,
        importMT5Trades,
      }}
    >
      {children}
    </TradeContext.Provider>
  );
};

export const useTrades = () => {
  const context = useContext(TradeContext);
  if (context === undefined) {
    throw new Error('useTrades must be used within a TradeProvider');
  }
  return context;
};
