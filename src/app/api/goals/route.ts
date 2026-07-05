/**
 * GET  /api/goals - List user goals
 * POST /api/goals - Create a new goal
 */

import { type NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth';
import { getGoals, createGoal } from '@/services/goalsService';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';
import { corsJsonResponse, handleOptionsRequest } from '@/lib/cors';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');

  try {
    const ip = getClientIP(request);
    const rateLimited = checkRateLimit(ip, 'general');
    if (rateLimited) return rateLimited;

    const user = authenticateRequest(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const result = await getGoals(user.userId);

    if (!result.success) {
      return corsJsonResponse(
        { success: false, error: result.error },
        500,
        origin
      );
    }

    return corsJsonResponse(
      { success: true, goals: result.data },
      200,
      origin
    );
  } catch (error) {
    logger.error('GET /api/goals error', error, 'GoalsRoute');
    return corsJsonResponse(
      { success: false, error: 'Internal server error' },
      500,
      origin
    );
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  try {
    const ip = getClientIP(request);
    const rateLimited = checkRateLimit(ip, 'general');
    if (rateLimited) return rateLimited;

    const user = authenticateRequest(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();

    if (!body.title || !body.target || !body.type || !body.deadline) {
      return corsJsonResponse(
        { success: false, error: 'Missing required goal fields (title, target, type, deadline)' },
        400,
        origin
      );
    }

    const result = await createGoal(user.userId, body);

    if (!result.success) {
      return corsJsonResponse(
        { success: false, error: result.error },
        500,
        origin
      );
    }

    return corsJsonResponse(
      { success: true, goal: result.data },
      201,
      origin
    );
  } catch (error) {
    logger.error('POST /api/goals error', error, 'GoalsRoute');
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
