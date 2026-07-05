/**
 * GET    /api/trades/[id]  - Get a specific trade
 * PUT    /api/trades/[id]  - Update a specific trade
 * DELETE /api/trades/[id]  - Delete a specific trade
 */

import { type NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth';
import { getTradeById, updateTrade, deleteTrade } from '@/services/tradeService';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';
import { corsJsonResponse, handleOptionsRequest } from '@/lib/cors';
import logger from '@/lib/logger';

// ============================================
// GET /api/trades/[id]
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get('origin');

  try {
    const ip = getClientIP(request);
    const rateLimited = checkRateLimit(ip, 'trades');
    if (rateLimited) return rateLimited;

    const user = authenticateRequest(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    const result = await getTradeById(user.userId, id);

    if (!result.success) {
      return corsJsonResponse(
        { success: false, error: result.error },
        result.statusCode || 500,
        origin
      );
    }

    return corsJsonResponse(
      { success: true, trade: result.data },
      200,
      origin
    );
  } catch (error) {
    logger.error('GET /api/trades/[id] error', error, 'TradeRoute');
    return corsJsonResponse(
      { success: false, error: 'Internal server error' },
      500,
      origin
    );
  }
}

// ============================================
// PUT /api/trades/[id]
// ============================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get('origin');

  try {
    const ip = getClientIP(request);
    const rateLimited = checkRateLimit(ip, 'trades');
    if (rateLimited) return rateLimited;

    const user = authenticateRequest(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const body = await request.json();

    // Validate direction if provided
    if (body.direction && !['Buy', 'Sell'].includes(body.direction)) {
      return corsJsonResponse(
        { success: false, error: 'Direction must be "Buy" or "Sell"' },
        400,
        origin
      );
    }

    // Validate numeric fields if provided
    const numericFields = ['volume', 'entryPrice', 'exitPrice', 'stopLoss', 'takeProfit'];
    for (const field of numericFields) {
      if (body[field] !== undefined && (typeof body[field] !== 'number' || body[field] < 0)) {
        return corsJsonResponse(
          { success: false, error: `${field} must be a non-negative number` },
          400,
          origin
        );
      }
    }

    const result = await updateTrade(user.userId, id, body);

    if (!result.success) {
      return corsJsonResponse(
        { success: false, error: result.error },
        result.statusCode || 500,
        origin
      );
    }

    return corsJsonResponse(
      { success: true, trade: result.data },
      200,
      origin
    );
  } catch (error) {
    logger.error('PUT /api/trades/[id] error', error, 'TradeRoute');
    return corsJsonResponse(
      { success: false, error: 'Internal server error' },
      500,
      origin
    );
  }
}

// ============================================
// DELETE /api/trades/[id]
// ============================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get('origin');

  try {
    const ip = getClientIP(request);
    const rateLimited = checkRateLimit(ip, 'trades');
    if (rateLimited) return rateLimited;

    const user = authenticateRequest(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    const result = await deleteTrade(user.userId, id);

    if (!result.success) {
      return corsJsonResponse(
        { success: false, error: result.error },
        result.statusCode || 500,
        origin
      );
    }

    return corsJsonResponse(
      { success: true, message: 'Trade deleted successfully' },
      200,
      origin
    );
  } catch (error) {
    logger.error('DELETE /api/trades/[id] error', error, 'TradeRoute');
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
