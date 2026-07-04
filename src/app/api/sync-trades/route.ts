import { NextRequest, NextResponse } from 'next/server';

/**
 * MT5 Trade Sync — Incoming payload shape from SyncTrades.mq5
 */
interface MT5TradePayload {
  ticket: number;
  positionId: number;
  symbol: string;
  direction: 'Buy' | 'Sell';
  lotSize: number;
  entryPrice: number;
  exitPrice: number;
  entryDate: string;   // YYYY-MM-DD
  entryTime: string;   // HH:MM
  exitDate: string;    // YYYY-MM-DD
  exitTime: string;    // HH:MM
  pnl: number;
  commission: number;
  swap: number;
}

interface SyncPayload {
  apiKey: string;
  trades: MT5TradePayload[];
}

// --- Helper functions (server-side duplicates of tradeUtils) ---

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

function calculateHoldingTime(
  entryDate: string, entryTime: string, exitDate: string, exitTime: string
): number {
  if (!entryDate || !entryTime || !exitDate || !exitTime) return 0;
  try {
    const entry = new Date(`${entryDate}T${entryTime}`);
    const exit = new Date(`${exitDate}T${exitTime}`);
    const diffMs = exit.getTime() - entry.getTime();
    if (isNaN(diffMs) || diffMs < 0) return 0;
    return Math.round(diffMs / 60000);
  } catch {
    return 0;
  }
}

/**
 * Transforms raw MT5 payload into a full Trade object ready for storage.
 */
function transformMT5Trade(mt5: MT5TradePayload, userId: string) {
  const dateObj = new Date(`${mt5.entryDate}T${mt5.entryTime || '12:00'}`);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const day = days[dateObj.getDay()] || 'Monday';
  const month = months[dateObj.getMonth()] || 'January';
  const year = dateObj.getFullYear();
  const week = getWeekNumber(dateObj);
  const session = detectSession(mt5.entryTime);
  const holdingTime = calculateHoldingTime(mt5.entryDate, mt5.entryTime, mt5.exitDate, mt5.exitTime);

  // Use the actual PnL from MT5 directly (it's the most accurate)
  const pnl = mt5.pnl;

  // RR calculation using actual price movement vs risk
  // Since we don't have SL/TP from MT5, compute actual RR from prices if closed
  const risk = mt5.exitPrice > 0 ? Math.abs(mt5.entryPrice - mt5.exitPrice) : 0;
  const rr = risk > 0 ? Number((Math.abs(pnl) / risk).toFixed(2)) : 0;

  // Status determination
  let status: 'Win' | 'Loss' | 'Break Even' | 'Open' = 'Open';
  if (mt5.exitPrice > 0) {
    if (pnl > 0.5) status = 'Win';
    else if (pnl < -0.5) status = 'Loss';
    else status = 'Break Even';
  }

  return {
    id: `mt5_${mt5.ticket}`,
    userId,
    pair: mt5.symbol,
    direction: mt5.direction,
    lotSize: mt5.lotSize,
    entryPrice: mt5.entryPrice,
    stopLoss: 0,          // Not available from MT5 deal history
    takeProfit: 0,        // Not available from MT5 deal history
    exitPrice: mt5.exitPrice,
    pnl: Number(pnl.toFixed(2)),
    rr,
    riskPct: 0,
    rewardPct: 0,
    commission: mt5.commission,
    swap: mt5.swap,
    status,
    date: mt5.entryDate,
    time: mt5.entryTime,
    day,
    week,
    month,
    year,
    session,
    holdingTime,
    notes: mt5.exitPrice > 0 
      ? `MT5 Position #${mt5.positionId} — Auto-imported` 
      : `MT5 Position #${mt5.positionId} — Running Open Position`,
    reason: 'MT5 Auto Import',
    logic: '',
    entryConfirmations: [],
    emotion: '',
    confidence: 5,
    mistakes: [],
    lessons: '',
    improvement: '',
    tags: ['mt5-import'],
    strategy: 'MT5 Sync',
    createdAt: Date.now(),
    source: 'mt5',
    mt5Ticket: mt5.ticket,
    mt5PositionId: mt5.positionId,
  };
}

// In-memory store for synced trades (picked up by client via GET)
// In production you'd write directly to Firestore here, but for a client-side
// Firebase auth flow we buffer them for the authenticated client to fetch.
let pendingTrades: ReturnType<typeof transformMT5Trade>[] = [];
let lastSyncTimestamp = 0;
let lastSyncCount = 0;

/**
 * POST /api/sync-trades
 * Receives trade data from MT5 SyncTrades.mq5 script
 */
export async function POST(request: NextRequest) {
  try {
    const body: SyncPayload = await request.json();

    if (!body.trades || !Array.isArray(body.trades) || body.trades.length === 0) {
      return NextResponse.json(
        { error: 'No trades provided in payload' },
        { status: 400 }
      );
    }

    // Use the apiKey as the userId identifier
    // In production, validate this against Firestore
    const userId = body.apiKey || 'anonymous';

    const transformed = body.trades.map((mt5Trade) =>
      transformMT5Trade(mt5Trade, userId)
    );

    // Buffer for client pickup
    pendingTrades = transformed;
    lastSyncTimestamp = Date.now();
    lastSyncCount = transformed.length;

    console.log(`[MT5 Sync] Received ${transformed.length} trades from MT5`);

    return NextResponse.json({
      success: true,
      message: `Imported ${transformed.length} trades successfully`,
      count: transformed.length,
      timestamp: lastSyncTimestamp,
    });
  } catch (error: any) {
    console.error('[MT5 Sync] Error processing trades:', error);
    return NextResponse.json(
      { error: 'Failed to process trades: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync-trades
 * Client polls this to pick up buffered MT5 trades
 */
export async function GET() {
  return NextResponse.json({
    trades: pendingTrades,
    count: pendingTrades.length,
    lastSync: lastSyncTimestamp,
    lastCount: lastSyncCount,
  });
}

/**
 * DELETE /api/sync-trades
 * Client calls this after successfully importing trades to clear the buffer
 */
export async function DELETE() {
  const cleared = pendingTrades.length;
  pendingTrades = [];
  return NextResponse.json({
    success: true,
    cleared,
  });
}
