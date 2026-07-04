import { db, isFirebaseEnabled } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { Trade, UserSettings, TradingGoal } from '../types';

const LOCAL_TRADES_KEY = 'trademind_trades';
const LOCAL_SETTINGS_KEY = 'trademind_settings';
const LOCAL_GOALS_KEY = 'trademind_goals';

const DEFAULT_SETTINGS: UserSettings = {
  currency: 'USD',
  timezone: 'UTC',
  defaultRiskPct: 1,
  theme: 'dark',
  weeklyTarget: 500,
  monthlyTarget: 2000,
  riskRules: '1. Never risk more than 2% per trade.\n2. Do not overtrade (max 3 trades a day).\n3. Cut losses early and let winners run.',
  tradingChecklist: [
    'HTF bias identified',
    'Liquidity sweep observed',
    'MSS / BOS confirmed on LTF',
    'FVG / Order block entry point set',
    'Risk/Reward ratio is 1:2 or higher',
    'High-impact news checked'
  ],
  riskLimit: 2.0,
  defaultLotSize: 0.1
};

// --- TRADES ---

export const getTrades = async (userId: string): Promise<Trade[]> => {
  if (isFirebaseEnabled && db) {
    try {
      const q = query(
        collection(db, 'trades'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const trades: Trade[] = [];
      snapshot.forEach((doc) => {
        trades.push(doc.data() as Trade);
      });
      return trades;
    } catch (e) {
      console.error('Firestore getTrades error, falling back to localStorage:', e);
    }
  }

  // LocalStorage fallback
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(`${LOCAL_TRADES_KEY}_${userId}`);
    if (raw) {
      try {
        const list = JSON.parse(raw) as Trade[];
        return list.sort((a, b) => b.createdAt - a.createdAt);
      } catch {
        return [];
      }
    }
  }
  return [];
};

export const saveTrade = async (trade: Trade): Promise<void> => {
  if (isFirebaseEnabled && db) {
    try {
      const docRef = doc(db, 'trades', trade.id);
      await setDoc(docRef, trade, { merge: true });
      return;
    } catch (e) {
      console.error('Firestore saveTrade error, falling back to localStorage:', e);
    }
  }

  // LocalStorage fallback
  if (typeof window !== 'undefined') {
    const userId = trade.userId;
    const trades = await getTrades(userId);
    const existingIndex = trades.findIndex(t => t.id === trade.id);
    if (existingIndex > -1) {
      trades[existingIndex] = trade;
    } else {
      trades.push(trade);
    }
    localStorage.setItem(`${LOCAL_TRADES_KEY}_${userId}`, JSON.stringify(trades));
  }
};

export const saveTradesBulk = async (trades: Trade[]): Promise<void> => {
  if (trades.length === 0) return;
  const userId = trades[0].userId;

  if (isFirebaseEnabled && db) {
    try {
      const promises = trades.map(async (trade) => {
        const docRef = doc(db, 'trades', trade.id);
        await setDoc(docRef, trade, { merge: true });
      });
      await Promise.all(promises);
      return;
    } catch (e) {
      console.error('Firestore saveTradesBulk error, falling back to localStorage:', e);
    }
  }

  // LocalStorage fallback
  if (typeof window !== 'undefined') {
    const existing = await getTrades(userId);
    const existingMap = new Map(existing.map(t => [t.id, t]));
    
    trades.forEach((trade) => {
      existingMap.set(trade.id, trade);
    });
    
    const updated = Array.from(existingMap.values());
    localStorage.setItem(`${LOCAL_TRADES_KEY}_${userId}`, JSON.stringify(updated));
  }
};

export const deleteTrade = async (userId: string, tradeId: string): Promise<void> => {
  if (isFirebaseEnabled && db) {
    try {
      const docRef = doc(db, 'trades', tradeId);
      await deleteDoc(docRef);
      return;
    } catch (e) {
      console.error('Firestore deleteTrade error, falling back to localStorage:', e);
    }
  }

  // LocalStorage fallback
  if (typeof window !== 'undefined') {
    const trades = await getTrades(userId);
    const filtered = trades.filter(t => t.id !== tradeId);
    localStorage.setItem(`${LOCAL_TRADES_KEY}_${userId}`, JSON.stringify(filtered));
  }
};

// --- SETTINGS ---

export const getSettings = async (userId: string): Promise<UserSettings> => {
  if (isFirebaseEnabled && db) {
    try {
      const docRef = doc(db, 'settings', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserSettings;
      }
    } catch (e) {
      console.error('Firestore getSettings error, falling back to localStorage:', e);
    }
  }

  // LocalStorage fallback
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(`${LOCAL_SETTINGS_KEY}_${userId}`);
    if (raw) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
  }
  return DEFAULT_SETTINGS;
};

export const saveSettings = async (userId: string, settings: UserSettings): Promise<void> => {
  if (isFirebaseEnabled && db) {
    try {
      const docRef = doc(db, 'settings', userId);
      await setDoc(docRef, settings, { merge: true });
      return;
    } catch (e) {
      console.error('Firestore saveSettings error, falling back to localStorage:', e);
    }
  }

  // LocalStorage fallback
  if (typeof window !== 'undefined') {
    localStorage.setItem(`${LOCAL_SETTINGS_KEY}_${userId}`, JSON.stringify(settings));
  }
};

// --- GOALS ---

export const getGoals = async (userId: string): Promise<TradingGoal[]> => {
  if (isFirebaseEnabled && db) {
    try {
      const q = query(
        collection(db, 'goals'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      const goals: TradingGoal[] = [];
      snapshot.forEach((doc) => {
        goals.push(doc.data() as TradingGoal);
      });
      return goals;
    } catch (e) {
      console.error('Firestore getGoals error, falling back to localStorage:', e);
    }
  }

  // LocalStorage fallback
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(`${LOCAL_GOALS_KEY}_${userId}`);
    if (raw) {
      try {
        return JSON.parse(raw) as TradingGoal[];
      } catch {
        return [];
      }
    }
  }
  return [];
};

export const saveGoal = async (userId: string, goal: TradingGoal & { userId?: string }): Promise<void> => {
  const finalGoal = { ...goal, userId };
  if (isFirebaseEnabled && db) {
    try {
      const docRef = doc(db, 'goals', goal.id);
      await setDoc(docRef, finalGoal, { merge: true });
      return;
    } catch (e) {
      console.error('Firestore saveGoal error, falling back to localStorage:', e);
    }
  }

  // LocalStorage fallback
  if (typeof window !== 'undefined') {
    const goals = await getGoals(userId);
    const existingIndex = goals.findIndex(g => g.id === goal.id);
    if (existingIndex > -1) {
      goals[existingIndex] = finalGoal;
    } else {
      goals.push(finalGoal);
    }
    localStorage.setItem(`${LOCAL_GOALS_KEY}_${userId}`, JSON.stringify(goals));
  }
};

export const deleteGoal = async (userId: string, goalId: string): Promise<void> => {
  if (isFirebaseEnabled && db) {
    try {
      const docRef = doc(db, 'goals', goalId);
      await deleteDoc(docRef);
      return;
    } catch (e) {
      console.error('Firestore deleteGoal error, falling back to localStorage:', e);
    }
  }

  // LocalStorage fallback
  if (typeof window !== 'undefined') {
    const goals = await getGoals(userId);
    const filtered = goals.filter(g => g.id !== goalId);
    localStorage.setItem(`${LOCAL_GOALS_KEY}_${userId}`, JSON.stringify(filtered));
  }
};
