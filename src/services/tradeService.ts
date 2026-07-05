/**
 * Trade Service
 * Handles all trade CRUD operations and business logic.
 */

import prisma from '@/lib/prisma';
import { computeTradeFields, type ParsedMT5Trade } from '@/services/mt5Parser';
import logger from '@/lib/logger';

// ============================================
// Types
// ============================================
export interface TradeCreateInput {
  ticket: number;
  symbol: string;
  direction: 'Buy' | 'Sell';
  volume: number;
  entryPrice: number;
  exitPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  openTime: string | Date;
  closeTime: string | Date;
  profit: number;
  commission?: number;
  swap?: number;
  
  // Journaling
  notes?: string;
  reason?: string;
  logic?: string;
  entryConfirmations?: string[];
  emotion?: string;
  confidence?: number;
  mistakes?: string[];
  lessons?: string;
  improvement?: string;
  tags?: string[];
  strategy?: string;
  
  // Screenshots
  beforeImage?: string;
  afterImage?: string;
  tvImage?: string;
  mt5Image?: string;

  // Metadata
  source?: string;
  mt5PositionId?: number;
  accountNumber?: number;
  brokerName?: string;
  serverName?: string;
}

export interface TradeUpdateInput {
  symbol?: string;
  direction?: 'Buy' | 'Sell';
  volume?: number;
  entryPrice?: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  openTime?: string | Date;
  closeTime?: string | Date;
  profit?: number;
  commission?: number;
  swap?: number;
  
  // Journaling
  notes?: string;
  reason?: string;
  logic?: string;
  entryConfirmations?: string[];
  emotion?: string;
  confidence?: number;
  mistakes?: string[];
  lessons?: string;
  improvement?: string;
  tags?: string[];
  strategy?: string;
  
  // Screenshots
  beforeImage?: string;
  afterImage?: string;
  tvImage?: string;
  mt5Image?: string;

  // Metadata
  source?: string;
  mt5PositionId?: number;
  accountNumber?: number;
  brokerName?: string;
  serverName?: string;
}

export interface TradeListQuery {
  page?: number;
  limit?: number;
  symbol?: string;
  direction?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// Get All Trades (with filtering & pagination)
// ============================================
export async function getTrades(userId: string, query: TradeListQuery = {}) {
  try {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(500, Math.max(1, query.limit || 100)); // larger limit for dashboard sync
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = { userId };

    if (query.symbol) {
      where.symbol = { contains: query.symbol.toUpperCase(), mode: 'insensitive' };
    }
    if (query.direction && ['Buy', 'Sell'].includes(query.direction)) {
      where.direction = query.direction;
    }
    if (query.status && ['Win', 'Loss', 'Break Even', 'Open'].includes(query.status)) {
      where.status = query.status;
    }
    if (query.startDate) {
      where.openTime = { ...(where.openTime as object || {}), gte: new Date(query.startDate) };
    }
    if (query.endDate) {
      where.closeTime = { ...(where.closeTime as object || {}), lte: new Date(query.endDate) };
    }

    // Build order
    const validSortFields = ['openTime', 'closeTime', 'profit', 'symbol', 'createdAt'];
    const sortBy = validSortFields.includes(query.sortBy || '') ? query.sortBy! : 'openTime';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where: where as any,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.trade.count({ where: where as any }),
    ]);

    return {
      success: true,
      data: {
        trades,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    logger.error('Failed to fetch trades', error, 'TradeService');
    return { success: false, error: 'Failed to fetch trades' };
  }
}

// ============================================
// Get Trade by ID
// ============================================
export async function getTradeById(userId: string, tradeId: string) {
  try {
    const trade = await prisma.trade.findFirst({
      where: { id: tradeId, userId },
    });

    if (!trade) {
      return { success: false, error: 'Trade not found', statusCode: 404 };
    }

    return { success: true, data: trade };
  } catch (error) {
    logger.error('Failed to fetch trade', error, 'TradeService');
    return { success: false, error: 'Failed to fetch trade' };
  }
}

// ============================================
// Create Trade
// ============================================
export async function createTrade(userId: string, input: TradeCreateInput) {
  try {
    // Check for duplicate ticket if ticket exists and is greater than 0
    if (input.ticket && input.ticket > 0) {
      const existing = await prisma.trade.findUnique({
        where: { ticket: input.ticket },
      });

      if (existing) {
        return {
          success: false,
          error: `Trade with ticket #${input.ticket} already exists`,
          statusCode: 409,
        };
      }
    }

    const openTime = new Date(input.openTime);
    const closeTime = new Date(input.closeTime);

    // Compute auto-calculated fields
    const parsedTrade: ParsedMT5Trade = {
      ticket: input.ticket || Math.floor(Math.random() * 100000000), // assign random ticket if manual
      symbol: input.symbol,
      direction: input.direction,
      volume: input.volume,
      entryPrice: input.entryPrice,
      exitPrice: input.exitPrice,
      stopLoss: input.stopLoss || 0,
      takeProfit: input.takeProfit || 0,
      openTime,
      closeTime,
      profit: input.profit,
      commission: input.commission || 0,
      swap: input.swap || 0,
    };

    const computed = computeTradeFields(parsedTrade);

    const trade = await prisma.trade.create({
      data: {
        userId,
        ticket: parsedTrade.ticket,
        symbol: input.symbol.toUpperCase(),
        direction: input.direction,
        volume: input.volume,
        entryPrice: input.entryPrice,
        exitPrice: input.exitPrice,
        stopLoss: input.stopLoss || 0,
        takeProfit: input.takeProfit || 0,
        openTime,
        closeTime,
        holdingTime: computed.holdingTime,
        session: computed.session,
        day: computed.day,
        week: computed.week,
        month: computed.month,
        year: computed.year,
        profit: input.profit,
        commission: input.commission || 0,
        swap: input.swap || 0,
        status: computed.status,
        riskReward: computed.riskReward,
        
        // Journaling
        notes: input.notes || null,
        reason: input.reason || null,
        logic: input.logic || null,
        entryConfirmations: input.entryConfirmations || [],
        emotion: input.emotion || null,
        confidence: input.confidence || 5,
        mistakes: input.mistakes || [],
        lessons: input.lessons || null,
        improvement: input.improvement || null,
        tags: input.tags || [],
        strategy: input.strategy || null,
        
        // Screenshots
        beforeImage: input.beforeImage || null,
        afterImage: input.afterImage || null,
        tvImage: input.tvImage || null,
        mt5Image: input.mt5Image || null,

        // Metadata
        source: input.source || 'manual',
        mt5PositionId: input.mt5PositionId || null,
        accountNumber: input.accountNumber || null,
        brokerName: input.brokerName || null,
        serverName: input.serverName || null,
      },
    });

    return { success: true, data: trade, statusCode: 201 };
  } catch (error) {
    logger.error('Failed to create trade', error, 'TradeService');
    return { success: false, error: 'Failed to create trade' };
  }
}

// ============================================
// Update Trade
// ============================================
export async function updateTrade(userId: string, tradeId: string, input: TradeUpdateInput) {
  try {
    // Verify ownership
    const existing = await prisma.trade.findFirst({
      where: { id: tradeId, userId },
    });

    if (!existing) {
      return { success: false, error: 'Trade not found', statusCode: 404 };
    }

    // Merge existing with updates
    const openTime = input.openTime ? new Date(input.openTime) : existing.openTime;
    const closeTime = input.closeTime ? new Date(input.closeTime) : existing.closeTime;
    const entryPrice = input.entryPrice ?? existing.entryPrice;
    const exitPrice = input.exitPrice ?? existing.exitPrice;
    const stopLoss = input.stopLoss ?? existing.stopLoss;
    const takeProfit = input.takeProfit ?? existing.takeProfit;
    const direction = (input.direction ?? existing.direction) as 'Buy' | 'Sell';
    const profit = input.profit ?? existing.profit;

    // Recompute auto-fields
    const parsedTrade: ParsedMT5Trade = {
      ticket: existing.ticket,
      symbol: input.symbol ?? existing.symbol,
      direction,
      volume: input.volume ?? existing.volume,
      entryPrice,
      exitPrice,
      stopLoss,
      takeProfit,
      openTime,
      closeTime,
      profit,
      commission: input.commission ?? existing.commission,
      swap: input.swap ?? existing.swap,
    };

    const computed = computeTradeFields(parsedTrade);

    const updated = await prisma.trade.update({
      where: { id: tradeId },
      data: {
        symbol: input.symbol?.toUpperCase() ?? existing.symbol,
        direction,
        volume: input.volume ?? existing.volume,
        entryPrice,
        exitPrice,
        stopLoss,
        takeProfit,
        openTime,
        closeTime,
        holdingTime: computed.holdingTime,
        session: computed.session,
        day: computed.day,
        week: computed.week,
        month: computed.month,
        year: computed.year,
        profit,
        commission: input.commission ?? existing.commission,
        swap: input.swap ?? existing.swap,
        status: computed.status,
        riskReward: computed.riskReward,
        
        // Journaling updates
        notes: input.notes !== undefined ? input.notes : existing.notes,
        reason: input.reason !== undefined ? input.reason : existing.reason,
        logic: input.logic !== undefined ? input.logic : existing.logic,
        entryConfirmations: input.entryConfirmations !== undefined ? input.entryConfirmations : existing.entryConfirmations,
        emotion: input.emotion !== undefined ? input.emotion : existing.emotion,
        confidence: input.confidence !== undefined ? input.confidence : existing.confidence,
        mistakes: input.mistakes !== undefined ? input.mistakes : existing.mistakes,
        lessons: input.lessons !== undefined ? input.lessons : existing.lessons,
        improvement: input.improvement !== undefined ? input.improvement : existing.improvement,
        tags: input.tags !== undefined ? input.tags : existing.tags,
        strategy: input.strategy !== undefined ? input.strategy : existing.strategy,
        
        // Screenshot updates
        beforeImage: input.beforeImage !== undefined ? input.beforeImage : existing.beforeImage,
        afterImage: input.afterImage !== undefined ? input.afterImage : existing.afterImage,
        tvImage: input.tvImage !== undefined ? input.tvImage : existing.tvImage,
        mt5Image: input.mt5Image !== undefined ? input.mt5Image : existing.mt5Image,

        // Metadata updates
        source: input.source !== undefined ? input.source : existing.source,
        mt5PositionId: input.mt5PositionId !== undefined ? input.mt5PositionId : existing.mt5PositionId,
        accountNumber: input.accountNumber !== undefined ? input.accountNumber : existing.accountNumber,
        brokerName: input.brokerName !== undefined ? input.brokerName : existing.brokerName,
        serverName: input.serverName !== undefined ? input.serverName : existing.serverName,
      },
    });

    return { success: true, data: updated };
  } catch (error) {
    logger.error('Failed to update trade', error, 'TradeService');
    return { success: false, error: 'Failed to update trade' };
  }
}

// ============================================
// Delete Trade
// ============================================
export async function deleteTrade(userId: string, tradeId: string) {
  try {
    const existing = await prisma.trade.findFirst({
      where: { id: tradeId, userId },
    });

    if (!existing) {
      return { success: false, error: 'Trade not found', statusCode: 404 };
    }

    await prisma.trade.delete({ where: { id: tradeId } });

    logger.info(`Trade deleted: ${tradeId}`, 'TradeService');
    return { success: true, data: { message: 'Trade deleted successfully' } };
  } catch (error) {
    logger.error('Failed to delete trade', error, 'TradeService');
    return { success: false, error: 'Failed to delete trade' };
  }
}

// ============================================
// Import MT5 Trades (Bulk)
// ============================================
export async function importMT5Trades(userId: string, trades: ParsedMT5Trade[]) {
  try {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const trade of trades) {
      try {
        // Check for duplicate
        const existing = await prisma.trade.findUnique({
          where: { ticket: trade.ticket },
        });

        if (existing) {
          skipped++;
          continue;
        }

        const computed = computeTradeFields(trade);

        await prisma.trade.create({
          data: {
            userId,
            ticket: trade.ticket,
            symbol: trade.symbol.toUpperCase(),
            direction: trade.direction,
            volume: trade.volume,
            entryPrice: trade.entryPrice,
            exitPrice: trade.exitPrice,
            stopLoss: trade.stopLoss,
            takeProfit: trade.takeProfit,
            openTime: trade.openTime,
            closeTime: trade.closeTime,
            holdingTime: computed.holdingTime,
            session: computed.session,
            day: computed.day,
            week: computed.week,
            month: computed.month,
            year: computed.year,
            profit: trade.profit,
            commission: trade.commission,
            swap: trade.swap,
            status: computed.status,
            riskReward: computed.riskReward,
            source: 'mt5',
          },
        });

        imported++;
      } catch (tradeError) {
        errors.push(`Ticket #${trade.ticket}: ${tradeError instanceof Error ? tradeError.message : 'Failed to save'}`);
      }
    }

    logger.info(
      `MT5 Import: ${imported} imported, ${skipped} skipped, ${errors.length} errors`,
      'TradeService'
    );

    return {
      success: true,
      data: {
        imported,
        skipped,
        total: trades.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    };
  } catch (error) {
    logger.error('MT5 import failed', error, 'TradeService');
    return { success: false, error: 'Failed to import trades' };
  }
}
