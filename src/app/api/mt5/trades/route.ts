import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseEnabled } from '../../../../lib/firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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

// In-memory buffer for LocalStorage fallback mode
// If the user runs the app without cloud Firebase, trades are buffered here and picked up by background polling.
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

    // 3. Reject duplicates by checking database or memory buffer
    if (isFirebaseEnabled && db) {
      const docRef = doc(db, 'trades', tradeId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return NextResponse.json({ message: 'Trade already synced', tradeId }, { status: 200 });
      }
    } else {
      const exists = earRetryBuffer.some(t => t.id === tradeId);
      if (exists) {
        return NextResponse.json({ message: 'Trade already synced (buffered)', tradeId }, { status: 200 });
      }
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

    const trade: Trade = {
      id: tradeId,
      userId,
      pair: symbol,
      direction,
      lotSize,
      entryPrice,
      stopLoss: stopLoss || 0,
      takeProfit: takeProfit || 0,
      exitPrice,
      pnl: Number(pnl.toFixed(2)),
      rr,
      riskPct: 0,
      rewardPct: 0,
      commission: Math.abs(commission || 0),
      swap: Math.abs(swap || 0),
      status,
      date: openTime.split(' ')[0].replace(/\./g, '-'),
      time: openTimeStr,
      day,
      week,
      month,
      year,
      session,
      holdingTime,
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
      createdAt: Date.now(),
      source: 'mt5',
      mt5Ticket: ticket,
      mt5PositionId: positionId,
      accountNumber,
      brokerName,
      serverName,
    };

    // 5. Save trade to database
    if (isFirebaseEnabled && db) {
      const docRef = doc(db, 'trades', tradeId);
      await setDoc(docRef, trade, { merge: true });
      console.log(`[MT5 EA Sync] Trade ${tradeId} saved directly to Firestore for user ${userId}`);
    } else {
      // Buffer it in memory for local-mode client pickup
      earRetryBuffer.push(trade);
      console.log(`[MT5 EA Sync] Trade ${tradeId} buffered in-memory (local mode) for user ${userId}`);
    }

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
 * Client background process calls this to fetch any newly buffered EA trades (local-mode only)
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
 * Client calls this to clear successfully downloaded trades from local buffer
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
