import { Trade } from '../types';

/**
 * Calculates the week of the year for a given date
 */
export const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

/**
 * Detects the trading session based on UTC/Reference time (HH:MM)
 */
export const detectSession = (timeStr: string): 'Asian' | 'London' | 'New York' | 'Overlap' => {
  if (!timeStr) return 'London';
  const [hours] = timeStr.split(':').map(Number);
  
  // London: 08:00 - 16:00 UTC (8 AM - 4 PM)
  // New York: 13:00 - 21:00 UTC (1 PM - 9 PM)
  // Overlap: 13:00 - 16:00 UTC (London and NY overlap)
  // Asian: 00:00 - 08:00 UTC and 21:00 - 24:00 UTC
  
  if (hours >= 13 && hours <= 16) {
    return 'Overlap';
  }
  if (hours >= 8 && hours < 13) {
    return 'London';
  }
  if (hours >= 13 && hours < 21) {
    return 'New York';
  }
  return 'Asian';
};

/**
 * Calculates holding time in minutes between entry and exit date-times
 */
export const calculateHoldingTime = (
  entryDate: string,
  entryTime: string,
  exitDate: string,
  exitTime: string
): number => {
  if (!entryDate || !entryTime || !exitDate || !exitTime) return 0;
  
  try {
    const entry = new Date(`${entryDate}T${entryTime}`);
    const exit = new Date(`${exitDate}T${exitTime}`);
    const diffMs = exit.getTime() - entry.getTime();
    
    if (isNaN(diffMs) || diffMs < 0) return 0;
    return Math.round(diffMs / 60000); // return in minutes
  } catch {
    return 0;
  }
};

/**
 * Formats holding time into human readable string
 */
export const formatHoldingTime = (minutes: number): string => {
  if (!minutes || minutes <= 0) return 'N/A';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 24) {
    return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
};

/**
 * Enriches a trade object with auto-calculated date/time/session/RR fields
 */
export const enrichTradeFields = (
  trade: Omit<Trade, 'day' | 'week' | 'month' | 'year' | 'session' | 'holdingTime' | 'rr' | 'pnl' | 'status'>,
  exitDate: string,
  exitTime: string
): Trade => {
  const dateObj = new Date(`${trade.date}T${trade.time || '12:00'}`);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const day = days[dateObj.getDay()] || 'Monday';
  const month = months[dateObj.getMonth()] || 'January';
  const year = dateObj.getFullYear();
  const week = getWeekNumber(dateObj);
  
  const session = detectSession(trade.time);
  const holdingTime = calculateHoldingTime(trade.date, trade.time, exitDate, exitTime);
  
  // Calculate PnL (Gross PnL + Swap + Commission)
  // Standard simple forex calculation or user provided
  let calculatedPnl = trade.entryPrice !== 0 && trade.exitPrice !== 0
    ? (trade.direction === 'Buy' 
        ? (trade.exitPrice - trade.entryPrice) 
        : (trade.entryPrice - trade.exitPrice)) * trade.lotSize * 100000 // assuming 100k standard lot for forex
    : 0;
  
  // Add commission & swap
  calculatedPnl = calculatedPnl - (trade.commission || 0) - (trade.swap || 0);

  // RR calculation:
  // Risk = Entry - SL, Reward = TP - Entry
  const risk = Math.abs(trade.entryPrice - trade.stopLoss);
  const reward = Math.abs(trade.takeProfit - trade.entryPrice);
  const rr = risk > 0 ? Number((reward / risk).toFixed(2)) : 0;
  
  // Status determination
  let status: 'Win' | 'Loss' | 'Break Even' | 'Open' = 'Open';
  if (trade.exitPrice > 0) {
    if (calculatedPnl > 2) {
      status = 'Win';
    } else if (calculatedPnl < -2) {
      status = 'Loss';
    } else {
      status = 'Break Even';
    }
  }
  
  return {
    ...trade,
    day,
    week,
    month,
    year,
    session,
    holdingTime,
    rr: rr,
    pnl: Number(calculatedPnl.toFixed(2)),
    status,
    createdAt: trade.createdAt || Date.now(),
  } as Trade;
};
