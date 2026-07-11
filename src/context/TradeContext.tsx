'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Trade, UserSettings, TradingGoal } from '../types';

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
  syncBrokerTrades: (
    brokerType: 'oanda' | 'xm' | 'goat' | 'none',
    apiKey: string,
    accountId: string,
    environment: 'demo' | 'live'
  ) => Promise<{ count: number }>;
  bulkAddTrades: (
    newTradesList: Omit<Trade, 'id' | 'userId' | 'day' | 'week' | 'month' | 'year' | 'session' | 'holdingTime' | 'rr' | 'pnl' | 'status' | 'createdAt'>[]
  ) => Promise<{ imported: number; skipped: number }>;
  importMT5HtmlReport: (file: File) => Promise<{ imported: number; skipped: number }>;
}

const TradeContext = createContext<TradeContextType | undefined>(undefined);

// ============================================
// Mapping Helpers (DB <-> Frontend)
// ============================================

export function mapDbTradeToFrontendTrade(dbTrade: any): Trade {
  return {
    id: dbTrade.id,
    userId: dbTrade.userId,
    pair: dbTrade.symbol,
    direction: dbTrade.direction as 'Buy' | 'Sell',
    lotSize: dbTrade.volume,
    entryPrice: dbTrade.entryPrice,
    stopLoss: dbTrade.stopLoss,
    takeProfit: dbTrade.takeProfit,
    exitPrice: dbTrade.exitPrice,
    pnl: dbTrade.profit,
    rr: dbTrade.riskReward || 0,
    riskPct: 0,
    rewardPct: 0,
    commission: dbTrade.commission,
    swap: dbTrade.swap,
    status: dbTrade.status as 'Win' | 'Loss' | 'Break Even' | 'Open',
    date: dbTrade.openTime ? new Date(dbTrade.openTime).toISOString().split('T')[0] : '',
    time: dbTrade.openTime ? new Date(dbTrade.openTime).toTimeString().substring(0, 5) : '',
    day: dbTrade.day,
    week: dbTrade.week,
    month: dbTrade.month,
    year: dbTrade.year,
    session: dbTrade.session as 'Asian' | 'London' | 'New York' | 'Overlap',
    holdingTime: dbTrade.holdingTime,
    
    // Journaling fields
    notes: dbTrade.notes || '',
    reason: dbTrade.reason || '',
    logic: dbTrade.logic || '',
    entryConfirmations: dbTrade.entryConfirmations || [],
    emotion: dbTrade.emotion || '',
    confidence: dbTrade.confidence || 5,
    mistakes: dbTrade.mistakes || [],
    lessons: dbTrade.lessons || '',
    improvement: dbTrade.improvement || '',
    tags: dbTrade.tags || [],
    strategy: dbTrade.strategy || '',
    
    // Screenshots
    beforeImage: dbTrade.beforeImage || undefined,
    afterImage: dbTrade.afterImage || undefined,
    tvImage: dbTrade.tvImage || undefined,
    mt5Image: dbTrade.mt5Image || undefined,

    // Sync metadata
    source: dbTrade.source || 'manual',
    mt5Ticket: dbTrade.ticket,
    mt5PositionId: dbTrade.mt5PositionId || undefined,
    accountNumber: dbTrade.accountNumber || undefined,
    brokerName: dbTrade.brokerName || undefined,
    serverName: dbTrade.serverName || undefined,
    createdAt: dbTrade.createdAt ? new Date(dbTrade.createdAt).getTime() : Date.now(),
  };
}

export function mapFrontendTradeToDbTrade(frontendTrade: any) {
  const openTime = frontendTrade.date && frontendTrade.time
    ? new Date(`${frontendTrade.date}T${frontendTrade.time}`).toISOString()
    : new Date(frontendTrade.createdAt || Date.now()).toISOString();
    
  const closeTime = frontendTrade.exitDate && frontendTrade.exitTime
    ? new Date(`${frontendTrade.exitDate}T${frontendTrade.exitTime}`).toISOString()
    : frontendTrade.closeTime
      ? new Date(frontendTrade.closeTime).toISOString()
      : openTime;

  return {
    ticket: Number(frontendTrade.mt5Ticket || frontendTrade.ticket || Math.floor(Math.random() * 100000000)),
    symbol: frontendTrade.pair || frontendTrade.symbol,
    direction: frontendTrade.direction,
    volume: Number(frontendTrade.lotSize || frontendTrade.volume),
    entryPrice: Number(frontendTrade.entryPrice),
    exitPrice: Number(frontendTrade.exitPrice || 0),
    stopLoss: Number(frontendTrade.stopLoss || 0),
    takeProfit: Number(frontendTrade.takeProfit || 0),
    openTime,
    closeTime,
    profit: Number(frontendTrade.pnl || frontendTrade.profit || 0),
    commission: Number(frontendTrade.commission || 0),
    swap: Number(frontendTrade.swap || 0),
    
    // Journaling fields
    notes: frontendTrade.notes || null,
    reason: frontendTrade.reason || null,
    logic: frontendTrade.logic || null,
    entryConfirmations: frontendTrade.entryConfirmations || [],
    emotion: frontendTrade.emotion || null,
    confidence: frontendTrade.confidence || 5,
    mistakes: frontendTrade.mistakes || [],
    lessons: frontendTrade.lessons || null,
    improvement: frontendTrade.improvement || null,
    tags: frontendTrade.tags || [],
    strategy: frontendTrade.strategy || null,
    
    // Screenshots
    beforeImage: frontendTrade.beforeImage || null,
    afterImage: frontendTrade.afterImage || null,
    tvImage: frontendTrade.tvImage || null,
    mt5Image: frontendTrade.mt5Image || null,

    // Sync metadata
    source: frontendTrade.source || 'manual',
    mt5PositionId: frontendTrade.mt5PositionId || null,
    accountNumber: frontendTrade.accountNumber || null,
    brokerName: frontendTrade.brokerName || null,
    serverName: frontendTrade.serverName || null,
  };
}

export const TradeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [goals, setGoals] = useState<TradingGoal[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper for request options with JWT Auth header
  const getRequestOptions = (method = 'GET', body: any = null) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('trademind_token') : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    return {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {})
    };
  };

  // Load user data from REST API endpoints on authentication change
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
        const [tradesRes, settingsRes, goalsRes] = await Promise.all([
          fetch('/api/trades?limit=500', getRequestOptions('GET')),
          fetch('/api/settings', getRequestOptions('GET')),
          fetch('/api/goals', getRequestOptions('GET'))
        ]);

        if (tradesRes.ok) {
          const tradesData = await tradesRes.json();
          if (tradesData.success && tradesData.trades) {
            setTrades(tradesData.trades.map(mapDbTradeToFrontendTrade));
          }
        }

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (settingsData.success && settingsData.settings) {
            setSettings(settingsData.settings);
          }
        }

        if (goalsRes.ok) {
          const goalsData = await goalsRes.json();
          if (goalsData.success && goalsData.goals) {
            setGoals(goalsData.goals);
          }
        }
      } catch (e) {
        console.error('Error loading trade context data from backend:', e);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  // Silent background polling to fetch any real-time MT5 EA trades from the bridge
  useEffect(() => {
    if (!user) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/mt5/trades?userId=${user.uid}`, getRequestOptions('GET'));
        if (!res.ok) return;

        const data = await res.json();
        
        if (data.trades && data.trades.length > 0) {
          console.log(`[TradeContext] Background polling detected ${data.trades.length} new EA trades. Refreshing...`);
          
          // Since the EA writes directly to the PostgreSQL database, we just need to re-fetch the latest trades from the server
          const tradesRes = await fetch('/api/trades?limit=500', getRequestOptions('GET'));
          if (tradesRes.ok) {
            const tradesData = await tradesRes.json();
            if (tradesData.success && tradesData.trades) {
              setTrades(tradesData.trades.map(mapDbTradeToFrontendTrade));
            }
          }

          // Clear buffer notification
          await fetch(`/api/mt5/trades?userId=${user.uid}`, getRequestOptions('DELETE'));
        }
      } catch (err) {
        console.error('[TradeContext] Failed to background poll EA trades:', err);
      }
    }, 8000); // Check every 8 seconds

    return () => clearInterval(pollInterval);
  }, [user, trades]);

  const addTrade = async (
    tradeData: Omit<Trade, 'id' | 'userId' | 'day' | 'week' | 'month' | 'year' | 'session' | 'holdingTime' | 'rr' | 'pnl' | 'status' | 'createdAt'>,
    exitDate: string,
    exitTime: string
  ) => {
    if (!user) throw new Error('Authentication required');

    const mappedPayload = mapFrontendTradeToDbTrade({
      ...tradeData,
      exitDate,
      exitTime,
      createdAt: Date.now()
    });

    const res = await fetch('/api/trades', getRequestOptions('POST', mappedPayload));
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to save trade to backend');
    }

    const frontendTrade = mapDbTradeToFrontendTrade(data.trade);
    setTrades((prev) => [frontendTrade, ...prev]);
  };

  const updateTrade = async (
    tradeId: string,
    updatedData: Partial<Trade>,
    exitDate?: string,
    exitTime?: string
  ) => {
    if (!user) throw new Error('Authentication required');

    const mappedPayload = mapFrontendTradeToDbTrade({
      ...updatedData,
      id: tradeId,
      ...(exitDate ? { exitDate } : {}),
      ...(exitTime ? { exitTime } : {})
    });

    const res = await fetch(`/api/trades/${tradeId}`, getRequestOptions('PUT', mappedPayload));
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update trade');
    }

    const updatedFrontendTrade = mapDbTradeToFrontendTrade(data.trade);
    setTrades((prev) =>
      prev.map((t) => (t.id === tradeId ? updatedFrontendTrade : t))
    );
  };

  const deleteTrade = async (tradeId: string) => {
    if (!user) throw new Error('Authentication required');

    const res = await fetch(`/api/trades/${tradeId}`, getRequestOptions('DELETE'));
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete trade');
    }

    setTrades((prev) => prev.filter((t) => t.id !== tradeId));
  };

  const updateSettings = async (newSettings: UserSettings) => {
    if (!user) throw new Error('Authentication required');

    const res = await fetch('/api/settings', getRequestOptions('POST', newSettings));
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to save settings');
    }

    setSettings(data.settings);
  };

  const addGoal = async (goalData: Omit<TradingGoal, 'id' | 'current' | 'completed'>) => {
    if (!user) throw new Error('Authentication required');

    const res = await fetch('/api/goals', getRequestOptions('POST', goalData));
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to create goal');
    }

    setGoals((prev) => [...prev, data.goal]);
  };

  const updateGoal = async (goalId: string, updatedFields: Partial<TradingGoal>) => {
    if (!user) throw new Error('Authentication required');

    const res = await fetch(`/api/goals/${goalId}`, getRequestOptions('PUT', updatedFields));
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update goal');
    }

    setGoals((prev) => prev.map((g) => (g.id === goalId ? data.goal : g)));
  };

  const deleteGoal = async (goalId: string) => {
    if (!user) throw new Error('Authentication required');

    const res = await fetch(`/api/goals/${goalId}`, getRequestOptions('DELETE'));
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete goal');
    }

    setGoals((prev) => prev.filter((g) => g.id !== goalId));
  };

  const importMT5Trades = async (): Promise<{ imported: number; skipped: number }> => {
    if (!user) throw new Error('Authentication required');

    // Fetch buffered trades from the sync API
    const syncRes = await fetch('/api/sync-trades', getRequestOptions('GET'));
    const syncData = await syncRes.json();

    if (!syncData.trades || syncData.trades.length === 0) {
      return { imported: 0, skipped: 0 };
    }

    // Call our backend bulk import API endpoint to write to PostgreSQL in one batch!
    const bulkRes = await fetch('/api/trades/bulk', getRequestOptions('POST', {
      trades: syncData.trades
    }));
    const bulkData = await bulkRes.json();

    if (!bulkRes.ok || !bulkData.success) {
      throw new Error(bulkData.error || 'Failed to bulk import trades');
    }

    // Reload all trades to get the updated list
    const tradesRes = await fetch('/api/trades?limit=500', getRequestOptions('GET'));
    if (tradesRes.ok) {
      const tradesData = await tradesRes.json();
      if (tradesData.success && tradesData.trades) {
        setTrades(tradesData.trades.map(mapDbTradeToFrontendTrade));
      }
    }

    // Clear the server buffer
    await fetch('/api/sync-trades', getRequestOptions('DELETE'));

    return { 
      imported: bulkData.imported || 0, 
      skipped: bulkData.skipped || 0 
    };
  };

  const syncBrokerTrades = async (
    brokerType: 'oanda' | 'xm' | 'goat' | 'none',
    apiKey: string,
    accountId: string,
    environment: 'demo' | 'live'
  ): Promise<{ count: number }> => {
    if (!user) throw new Error('Authentication required');

    const res = await fetch('/api/broker/sync', getRequestOptions('POST', {
      userId: user.uid,
      brokerApiKey: apiKey,
      brokerAccountId: accountId,
      brokerEnvironment: environment,
    }));

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to sync broker trades');
    }

    const data = await res.json();

    // Call our backend bulk import endpoint to save the synced broker trades to PostgreSQL database
    if (data.trades && data.trades.length > 0) {
      const bulkRes = await fetch('/api/trades/bulk', getRequestOptions('POST', {
        trades: data.trades
      }));
      if (!bulkRes.ok) {
        throw new Error('Failed to save synced broker trades to database');
      }
    }

    // Refresh trades
    const tradesRes = await fetch('/api/trades?limit=500', getRequestOptions('GET'));
    if (tradesRes.ok) {
      const tradesData = await tradesRes.json();
      if (tradesData.success && tradesData.trades) {
        setTrades(tradesData.trades.map(mapDbTradeToFrontendTrade));
      }
    }

    // Save sync info to settings
    if (settings) {
      const updatedSettings: UserSettings = {
        ...settings,
        brokerType,
        brokerApiKey: apiKey,
        brokerAccountId: accountId,
        brokerEnvironment: environment,
        brokerConnected: true,
        brokerLastSync: Date.now(),
      };
      await updateSettings(updatedSettings);
    }

    return { count: data.count };
  };

  const bulkAddTrades = async (
    newTradesList: Omit<Trade, 'id' | 'userId' | 'day' | 'week' | 'month' | 'year' | 'session' | 'holdingTime' | 'rr' | 'pnl' | 'status' | 'createdAt'>[]
  ): Promise<{ imported: number; skipped: number }> => {
    if (!user) throw new Error('Authentication required');

    const res = await fetch('/api/trades/bulk', getRequestOptions('POST', {
      trades: newTradesList
    }));
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to bulk add trades');
    }

    // Refresh trades
    const tradesRes = await fetch('/api/trades?limit=500', getRequestOptions('GET'));
    if (tradesRes.ok) {
      const tradesData = await tradesRes.json();
      if (tradesData.success && tradesData.trades) {
        setTrades(tradesData.trades.map(mapDbTradeToFrontendTrade));
      }
    }

    return { 
      imported: data.imported || 0, 
      skipped: data.skipped || 0 
    };
  };

  const importMT5HtmlReport = async (file: File): Promise<{ imported: number; skipped: number }> => {
    if (!user) throw new Error('Authentication required');

    const token = typeof window !== 'undefined' ? localStorage.getItem('trademind_token') : null;
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/trades/import/html', {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: formData
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      const errorMsg = data.error || 'Failed to import MT5 HTML report';
      const detailsMsg = data.details && Array.isArray(data.details) ? `: ${data.details.join(', ')}` : '';
      throw new Error(`${errorMsg}${detailsMsg}`);
    }

    // Refresh trades
    const tradesRes = await fetch('/api/trades?limit=500', getRequestOptions('GET'));
    if (tradesRes.ok) {
      const tradesData = await tradesRes.json();
      if (tradesData.success && tradesData.trades) {
        setTrades(tradesData.trades.map(mapDbTradeToFrontendTrade));
      }
    }

    return { 
      imported: data.data?.imported || 0, 
      skipped: data.data?.skipped || 0 
    };
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
        syncBrokerTrades,
        bulkAddTrades,
        importMT5HtmlReport,
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
