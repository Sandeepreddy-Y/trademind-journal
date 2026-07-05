import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Trade } from '../../../../types';

// Helper functions for date calculations
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function detectSession(timeStr: string): 'Asian' | 'London' | 'New York' | 'Overlap' {
  if (!timeStr) return 'London';
  const [hours] = timeStr.split(':').map(Number);
  if (hours >= 13 && hours <= 16) return 'Overlap';
  if (hours >= 8 && hours < 13) return 'London';
  if (hours > 16 && hours < 21) return 'New York';
  return 'Asian';
}

function parseMT5DateTime(dtStr: string): Date {
  // Converts "2026.07.04 15:30:22" to standard JS Date
  const formatted = dtStr.replace(/\./g, '-').replace(' ', 'T');
  const d = new Date(formatted);
  return isNaN(d.getTime()) ? new Date() : d;
}

// In-memory buffer for LocalMode notifications.
// When a trade is synced, we save it to the DB, but also add its ticket to this list.
// The frontend polls and reads this list, refreshes the UI, and clears it.
let earRetryBuffer: any[] = [];

/**
 * POST /api/mt5/trades
 * Called by TradeMindEA.mq5 Expert Advisor in real-time
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify Bearer API Key
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[MT5 EA Sync] Unauthorized: Missing or invalid Authorization header');
      return NextResponse.json({ error: 'Unauthorized: Missing Bearer Token' }, { status: 401 });
    }
    
    const apiKey = authHeader.substring(7).trim();
    if (!apiKey) {
      return NextResponse.json({ error: 'Unauthorized: API Key is empty' }, { status: 401 });
    }

    const body = await request.json();
    const {
      accountNumber,
      brokerName,
      serverName,
      ticket,
      positionId,
      symbol,
      direction,
      lotSize,
      entryPrice,
      exitPrice,
      stopLoss,
      takeProfit,
      pnl,
      commission,
      swap,
      openTime,
      closeTime,
      durationSeconds,
      magicNumber,
      comment
    } = body;

    // 2. Validate all incoming data
    if (!ticket || !positionId || !symbol || !direction || !lotSize || !entryPrice || !exitPrice || !openTime || !closeTime) {
      console.error('[MT5 EA Sync] Bad Request: Missing required parameters in payload', body);
      return NextResponse.json({ error: 'Bad Request: Missing required trade parameters' }, { status: 400 });
    }

    const tradeId = `mt5_${ticket}`;
    const userId = apiKey; // API Key represents the User ID (UID)

    // Verify user exists in PostgreSQL database
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      console.error(`[MT5 EA Sync] Unauthorized: User ${userId} not found in database`);
      return NextResponse.json({ error: 'Unauthorized: Invalid User ID' }, { status: 401 });
    }

    // 3. Reject duplicates by checking database
    const existingInDb = await prisma.trade.findUnique({
      where: { ticket: Number(ticket) },
    });

    if (existingInDb) {
      return NextResponse.json({ message: 'Trade already synced', tradeId }, { status: 200 });
    }

    // 4. Enrich Trade Metrics
    const openDateObj = parseMT5DateTime(openTime);
    const closeDateObj = parseMT5DateTime(closeTime);
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const day = days[openDateObj.getDay()] || 'Monday';
    const month = months[openDateObj.getMonth()] || 'January';
    const year = openDateObj.getFullYear();
    const week = getWeekNumber(openDateObj);

    const openTimeStr = openTime.includes(' ') ? openTime.split(' ')[1].substring(0, 5) : '12:00';
    const session = detectSession(openTimeStr);
    
    // Holding time in minutes
    const holdingTime = Math.max(0, Math.round(durationSeconds / 60));

    // Status determination
    let status: 'Win' | 'Loss' | 'Break Even' | 'Open' = 'Open';
    if (pnl > 0.5) status = 'Win';
    else if (pnl < -0.5) status = 'Loss';
    else status = 'Break Even';

    // Risk Reward calculation using stopLoss
    let rr = 0;
    const riskDiff = Math.abs(entryPrice - stopLoss);
    if (stopLoss > 0 && riskDiff > 0) {
      const rewardDiff = Math.abs(exitPrice - entryPrice);
      rr = Number((rewardDiff / riskDiff).toFixed(2));
    } else {
      // Fallback: Compute actual price movement risk if no stopLoss is present
      const movement = Math.abs(entryPrice - exitPrice);
      rr = movement > 0 ? Number((Math.abs(pnl) / movement).toFixed(2)) : 0;
    }

    // 5. Save trade to database
    await prisma.trade.create({
      data: {
        id: tradeId,
        userId,
        ticket: Number(ticket),
        symbol: symbol.toUpperCase(),
        direction,
        volume: Number(lotSize),
        entryPrice: Number(entryPrice),
        exitPrice: Number(exitPrice),
        stopLoss: Number(stopLoss || 0),
        takeProfit: Number(takeProfit || 0),
        openTime: openDateObj,
        closeTime: closeDateObj,
        holdingTime,
        session,
        day,
        week,
        month,
        year,
        profit: Number(pnl),
        commission: Number(commission || 0),
        swap: Number(swap || 0),
        status,
        riskReward: rr,
        notes: comment ? `MT5 Comment: ${comment}` : `MT5 Position #${positionId} — Real-time synced`,
        reason: 'MT5 Auto Import',
        logic: '',
        entryConfirmations: [],
        emotion: '',
        confidence: 5,
        mistakes: [],
        lessons: '',
        improvement: '',
        tags: ['mt5-import', 'real-time'],
        strategy: magicNumber > 0 ? `MT5 Magic ${magicNumber}` : 'MT5 Sync',
        source: 'mt5',
        mt5PositionId: Number(positionId),
        accountNumber: Number(accountNumber),
        brokerName,
        serverName,
      },
    });

    console.log(`[MT5 EA Sync] Trade ${tradeId} saved directly to PostgreSQL for user ${userId}`);

    // Buffer the notification so the client-side context knows to update
    earRetryBuffer.push({ id: tradeId, userId });

    return NextResponse.json({
      success: true,
      message: 'Trade synced successfully',
      tradeId,
      status
    }, { status: 201 });

  } catch (error: any) {
    console.error('[MT5 EA Sync] Server error processing trade:', error);
    return NextResponse.json({
      error: 'Internal Server Error',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/mt5/trades
 * Client background process calls this to fetch any newly buffered EA trades notifications (local-mode only)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
  }

  // Filter buffered trades for this user
  const userTrades = earRetryBuffer.filter(t => t.userId === userId);
  return NextResponse.json({ trades: userTrades });
}

/**
 * DELETE /api/mt5/trades
 * Client calls this to clear successfully downloaded trades from local notification buffer
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
  }

  // Keep other users' trades, clear current user's trades
  earRetryBuffer = earRetryBuffer.filter(t => t.userId !== userId);
  return NextResponse.json({ success: true });
}
