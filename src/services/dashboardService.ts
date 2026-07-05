/**
 * Dashboard Service
 * Computes trading analytics and statistics.
 */

import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// ============================================
// Types
// ============================================
interface DashboardData {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  averageRR: number;
  totalProfit: number;
  currentDrawdown: number;
  monthlyPnL: Record<string, number>;
  weeklyPnL: Record<string, number>;
  bestPair: { symbol: string; profit: number } | null;
  worstPair: { symbol: string; profit: number } | null;
  winCount: number;
  lossCount: number;
  breakEvenCount: number;
  averageProfit: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  sessionBreakdown: Record<string, { count: number; profit: number; winRate: number }>;
  dayBreakdown: Record<string, { count: number; profit: number; winRate: number }>;
}

// ============================================
// Get Dashboard Data
// ============================================
export async function getDashboardData(userId: string): Promise<{
  success: boolean;
  data?: DashboardData;
  error?: string;
}> {
  try {
    const trades = await prisma.trade.findMany({
      where: { userId },
      orderBy: { openTime: 'asc' },
    });

    if (trades.length === 0) {
      return {
        success: true,
        data: {
          totalTrades: 0,
          winRate: 0,
          profitFactor: 0,
          averageRR: 0,
          totalProfit: 0,
          currentDrawdown: 0,
          monthlyPnL: {},
          weeklyPnL: {},
          bestPair: null,
          worstPair: null,
          winCount: 0,
          lossCount: 0,
          breakEvenCount: 0,
          averageProfit: 0,
          averageLoss: 0,
          largestWin: 0,
          largestLoss: 0,
          consecutiveWins: 0,
          consecutiveLosses: 0,
          sessionBreakdown: {},
          dayBreakdown: {},
        },
      };
    }

    // Basic counts
    const totalTrades = trades.length;
    const wins = trades.filter((t) => t.status === 'Win');
    const losses = trades.filter((t) => t.status === 'Loss');
    const breakEvens = trades.filter((t) => t.status === 'Break Even');

    const winCount = wins.length;
    const lossCount = losses.length;
    const breakEvenCount = breakEvens.length;

    // Win Rate
    const winRate = totalTrades > 0 ? Number(((winCount / totalTrades) * 100).toFixed(2)) : 0;

    // Total Profit
    const totalProfit = Number(trades.reduce((sum, t) => sum + t.profit, 0).toFixed(2));

    // Profit Factor = Gross Wins / Gross Losses (absolute)
    const grossWins = wins.reduce((sum, t) => sum + t.profit, 0);
    const grossLosses = Math.abs(losses.reduce((sum, t) => sum + t.profit, 0));
    const profitFactor = grossLosses > 0 ? Number((grossWins / grossLosses).toFixed(2)) : grossWins > 0 ? Infinity : 0;

    // Average RR
    const tradesWithRR = trades.filter((t) => t.riskReward !== null && t.riskReward !== undefined);
    const averageRR =
      tradesWithRR.length > 0
        ? Number((tradesWithRR.reduce((sum, t) => sum + (t.riskReward || 0), 0) / tradesWithRR.length).toFixed(2))
        : 0;

    // Average Win/Loss
    const averageProfit = winCount > 0 ? Number((grossWins / winCount).toFixed(2)) : 0;
    const averageLoss = lossCount > 0 ? Number((grossLosses / lossCount).toFixed(2)) : 0;

    // Largest Win/Loss
    const largestWin = wins.length > 0 ? Math.max(...wins.map((t) => t.profit)) : 0;
    const largestLoss = losses.length > 0 ? Math.min(...losses.map((t) => t.profit)) : 0;

    // Current Drawdown
    let peak = 0;
    let equity = 0;
    let maxDrawdown = 0;
    for (const trade of trades) {
      equity += trade.profit;
      if (equity > peak) peak = equity;
      const drawdown = peak - equity;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    const currentDrawdown = Number((peak - equity).toFixed(2));

    // Consecutive Wins/Losses
    let maxConsecWins = 0;
    let maxConsecLosses = 0;
    let currentConsecWins = 0;
    let currentConsecLosses = 0;

    for (const trade of trades) {
      if (trade.status === 'Win') {
        currentConsecWins++;
        currentConsecLosses = 0;
        if (currentConsecWins > maxConsecWins) maxConsecWins = currentConsecWins;
      } else if (trade.status === 'Loss') {
        currentConsecLosses++;
        currentConsecWins = 0;
        if (currentConsecLosses > maxConsecLosses) maxConsecLosses = currentConsecLosses;
      } else {
        currentConsecWins = 0;
        currentConsecLosses = 0;
      }
    }

    // Monthly PnL (YYYY-MM -> profit)
    const monthlyPnL: Record<string, number> = {};
    for (const trade of trades) {
      const key = `${trade.year}-${String(trade.openTime.getMonth() + 1).padStart(2, '0')}`;
      monthlyPnL[key] = Number(((monthlyPnL[key] || 0) + trade.profit).toFixed(2));
    }

    // Weekly PnL (YYYY-WXX -> profit)
    const weeklyPnL: Record<string, number> = {};
    for (const trade of trades) {
      const key = `${trade.year}-W${String(trade.week).padStart(2, '0')}`;
      weeklyPnL[key] = Number(((weeklyPnL[key] || 0) + trade.profit).toFixed(2));
    }

    // Best/Worst Pair
    const pairProfits: Record<string, number> = {};
    for (const trade of trades) {
      pairProfits[trade.symbol] = (pairProfits[trade.symbol] || 0) + trade.profit;
    }

    const pairEntries = Object.entries(pairProfits);
    let bestPair: { symbol: string; profit: number } | null = null;
    let worstPair: { symbol: string; profit: number } | null = null;

    if (pairEntries.length > 0) {
      pairEntries.sort((a, b) => b[1] - a[1]);
      bestPair = { symbol: pairEntries[0][0], profit: Number(pairEntries[0][1].toFixed(2)) };
      worstPair = {
        symbol: pairEntries[pairEntries.length - 1][0],
        profit: Number(pairEntries[pairEntries.length - 1][1].toFixed(2)),
      };
    }

    // Session Breakdown
    const sessionBreakdown: Record<string, { count: number; profit: number; winRate: number }> = {};
    for (const trade of trades) {
      if (!sessionBreakdown[trade.session]) {
        sessionBreakdown[trade.session] = { count: 0, profit: 0, winRate: 0 };
      }
      sessionBreakdown[trade.session].count++;
      sessionBreakdown[trade.session].profit += trade.profit;
    }
    // Calculate win rates per session
    for (const session of Object.keys(sessionBreakdown)) {
      const sessionTrades = trades.filter((t) => t.session === session);
      const sessionWins = sessionTrades.filter((t) => t.status === 'Win').length;
      sessionBreakdown[session].winRate =
        sessionTrades.length > 0
          ? Number(((sessionWins / sessionTrades.length) * 100).toFixed(2))
          : 0;
      sessionBreakdown[session].profit = Number(sessionBreakdown[session].profit.toFixed(2));
    }

    // Day Breakdown
    const dayBreakdown: Record<string, { count: number; profit: number; winRate: number }> = {};
    for (const trade of trades) {
      if (!dayBreakdown[trade.day]) {
        dayBreakdown[trade.day] = { count: 0, profit: 0, winRate: 0 };
      }
      dayBreakdown[trade.day].count++;
      dayBreakdown[trade.day].profit += trade.profit;
    }
    for (const day of Object.keys(dayBreakdown)) {
      const dayTrades = trades.filter((t) => t.day === day);
      const dayWins = dayTrades.filter((t) => t.status === 'Win').length;
      dayBreakdown[day].winRate =
        dayTrades.length > 0
          ? Number(((dayWins / dayTrades.length) * 100).toFixed(2))
          : 0;
      dayBreakdown[day].profit = Number(dayBreakdown[day].profit.toFixed(2));
    }

    return {
      success: true,
      data: {
        totalTrades,
        winRate,
        profitFactor: profitFactor === Infinity ? 999.99 : profitFactor,
        averageRR,
        totalProfit,
        currentDrawdown,
        monthlyPnL,
        weeklyPnL,
        bestPair,
        worstPair,
        winCount,
        lossCount,
        breakEvenCount,
        averageProfit,
        averageLoss,
        largestWin,
        largestLoss: Math.abs(largestLoss),
        consecutiveWins: maxConsecWins,
        consecutiveLosses: maxConsecLosses,
        sessionBreakdown,
        dayBreakdown,
      },
    };
  } catch (error) {
    logger.error('Dashboard computation failed', error, 'DashboardService');
    return { success: false, error: 'Failed to compute dashboard data' };
  }
}
