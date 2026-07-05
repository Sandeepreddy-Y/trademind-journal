/**
 * PUT    /api/goals/[id] - Update a goal
 * DELETE /api/goals/[id] - Delete a goal
 */

import { type NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth';
import { updateGoal, deleteGoal } from '@/services/goalsService';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';
import { corsJsonResponse, handleOptionsRequest } from '@/lib/cors';
import logger from '@/lib/logger';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get('origin');

  try {
    const ip = getClientIP(request);
    const rateLimited = checkRateLimit(ip, 'general');
    if (rateLimited) return rateLimited;

    const user = authenticateRequest(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const body = await request.json();

    const result = await updateGoal(user.userId, id, body);

    if (!result.success) {
      return corsJsonResponse(
        { success: false, error: result.error },
        result.statusCode || 500,
        origin
      );
    }

    return corsJsonResponse(
      { success: true, goal: result.data },
      200,
      origin
    );
  } catch (error) {
    logger.error('PUT /api/goals/[id] error', error, 'GoalsRoute');
    return corsJsonResponse(
      { success: false, error: 'Internal server error' },
      500,
      origin
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get('origin');

  try {
    const ip = getClientIP(request);
    const rateLimited = checkRateLimit(ip, 'general');
    if (rateLimited) return rateLimited;

    const user = authenticateRequest(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    const result = await deleteGoal(user.userId, id);

    if (!result.success) {
      return corsJsonResponse(
        { success: false, error: result.error },
        result.statusCode || 500,
        origin
      );
    }

    return corsJsonResponse(
      { success: true, message: 'Goal deleted successfully' },
      200,
      origin
    );
  } catch (error) {
    logger.error('DELETE /api/goals/[id] error', error, 'GoalsRoute');
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
