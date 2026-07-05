/**
 * POST /api/trades/bulk - Bulk import trades (manually sync'd, broker sync'd or MT5 script sync'd)
 */

import { type NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth';
import { importMT5Trades } from '@/services/tradeService';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';
import { corsJsonResponse, handleOptionsRequest } from '@/lib/cors';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  try {
    const ip = getClientIP(request);
    const rateLimited = checkRateLimit(ip, 'trades');
    if (rateLimited) return rateLimited;

    const user = authenticateRequest(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { trades } = body;

    if (!trades || !Array.isArray(trades)) {
      return corsJsonResponse(
        { success: false, error: 'Invalid payload: trades array required' },
        400,
        origin
      );
    }

    // Map frontend trade structures to ParsedMT5Trade inputs for importMT5Trades
    const formattedTrades = trades.map((t: any) => {
      const openTime = t.date && t.time ? new Date(`${t.date}T${t.time}`) : new Date(t.openTime || t.createdAt);
      const closeTime = t.exitDate && t.exitTime 
        ? new Date(`${t.exitDate}T${t.exitTime}`) 
        : t.closeTime 
          ? new Date(t.closeTime) 
          : openTime;

      return {
        ticket: Number(t.mt5Ticket || t.ticket || Math.floor(Math.random() * 100000000)),
        symbol: t.pair || t.symbol,
        direction: t.direction as 'Buy' | 'Sell',
        volume: Number(t.lotSize || t.volume),
        entryPrice: Number(t.entryPrice),
        exitPrice: Number(t.exitPrice || 0),
        stopLoss: Number(t.stopLoss || 0),
        takeProfit: Number(t.takeProfit || 0),
        openTime,
        closeTime,
        profit: Number(t.pnl || t.profit || 0),
        commission: Number(t.commission || 0),
        swap: Number(t.swap || 0),
      };
    });

    const result = await importMT5Trades(user.userId, formattedTrades);

    if (!result.success) {
      return corsJsonResponse(
        { success: false, error: result.error },
        500,
        origin
      );
    }

    return corsJsonResponse(
      { success: true, ...result.data },
      200,
      origin
    );
  } catch (error) {
    logger.error('POST /api/trades/bulk error', error, 'TradeBulkRoute');
    return corsJsonResponse(
      { success: false, error: 'Internal server error' },
      500,
      origin
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleOptionsRequest(request.headers.get('origin'));
}
