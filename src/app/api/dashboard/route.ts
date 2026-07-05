/**
 * GET /api/dashboard
 * Returns comprehensive trading analytics and statistics.
 * 
 * Response includes:
 * - Total Trades, Win Rate, Profit Factor, Average RR
 * - Total Profit, Current Drawdown
 * - Monthly PnL, Weekly PnL
 * - Best Pair, Worst Pair
 * - Session and Day breakdowns
 * - Consecutive win/loss streaks
 */

import { type NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth';
import { getDashboardData } from '@/services/dashboardService';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';
import { corsJsonResponse, handleOptionsRequest } from '@/lib/cors';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');

  try {
    // Rate limiting
    const ip = getClientIP(request);
    const rateLimited = checkRateLimit(ip, 'dashboard');
    if (rateLimited) return rateLimited;

    // Authenticate
    const user = authenticateRequest(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const result = await getDashboardData(user.userId);

    if (!result.success) {
      return corsJsonResponse(
        { success: false, error: result.error },
        500,
        origin
      );
    }

    return corsJsonResponse(
      { success: true, dashboard: result.data },
      200,
      origin
    );
  } catch (error) {
    logger.error('GET /api/dashboard error', error, 'DashboardRoute');
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
