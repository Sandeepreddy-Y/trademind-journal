/**
 * GET  /api/trades       - List all trades with filtering & pagination
 * POST /api/trades       - Create a new trade manually
 */

import { type NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth';
import { getTrades, createTrade } from '@/services/tradeService';
import { validateTradeInput } from '@/lib/validators';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';
import { corsJsonResponse, handleOptionsRequest } from '@/lib/cors';
import logger from '@/lib/logger';

// ============================================
// GET /api/trades
// ============================================
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');

  try {
    // Rate limiting
    const ip = getClientIP(request);
    const rateLimited = checkRateLimit(ip, 'trades');
    if (rateLimited) return rateLimited;

    // Authenticate
    const user = authenticateRequest(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // Parse query params
    const { searchParams } = request.nextUrl;
    const query = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      symbol: searchParams.get('symbol') || undefined,
      direction: searchParams.get('direction') || undefined,
      status: searchParams.get('status') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined,
    };

    const result = await getTrades(user.userId, query);

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
    logger.error('GET /api/trades error', error, 'TradeRoute');
    return corsJsonResponse(
      { success: false, error: 'Internal server error' },
      500,
      origin
    );
  }
}

// ============================================
// POST /api/trades
// ============================================
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  try {
    // Rate limiting
    const ip = getClientIP(request);
    const rateLimited = checkRateLimit(ip, 'trades');
    if (rateLimited) return rateLimited;

    // Authenticate
    const user = authenticateRequest(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();

    // Validate
    const validation = validateTradeInput(body);
    if (!validation.valid) {
      return corsJsonResponse(
        { success: false, errors: validation.errors },
        400,
        origin
      );
    }

    const result = await createTrade(user.userId, body);

    if (!result.success) {
      return corsJsonResponse(
        { success: false, error: result.error },
        result.statusCode || 500,
        origin
      );
    }

    return corsJsonResponse(
      { success: true, trade: result.data },
      201,
      origin
    );
  } catch (error) {
    logger.error('POST /api/trades error', error, 'TradeRoute');
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
