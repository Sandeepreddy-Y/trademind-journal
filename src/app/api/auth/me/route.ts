/**
 * GET /api/auth/me
 * Get current authenticated user's profile.
 * 
 * POST /api/auth/me (logout)
 * Invalidate session (client-side token removal).
 */

import { type NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth';
import { getUserProfile } from '@/services/authService';
import { corsJsonResponse, handleOptionsRequest } from '@/lib/cors';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');

  try {
    const user = authenticateRequest(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const result = await getUserProfile(user.userId);

    if (!result.success) {
      return corsJsonResponse(
        { success: false, error: result.error },
        404,
        origin
      );
    }

    return corsJsonResponse(
      { success: true, user: result.user },
      200,
      origin
    );
  } catch (error) {
    logger.error('Get profile endpoint error', error, 'AuthRoute');
    return corsJsonResponse(
      { success: false, error: 'Internal server error' },
      500,
      origin
    );
  }
}

/**
 * POST /api/auth/me - Logout
 * Since JWT is stateless, logout is handled client-side by removing the token.
 * This endpoint can be used for server-side session cleanup if needed.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  try {
    const user = authenticateRequest(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // In a production system with refresh tokens, you would:
    // 1. Invalidate the refresh token in the database
    // 2. Add the current JWT to a blacklist (Redis)
    
    logger.info(`User logged out: ${user.email}`, 'AuthRoute');

    return corsJsonResponse(
      { success: true, message: 'Logged out successfully' },
      200,
      origin
    );
  } catch (error) {
    logger.error('Logout endpoint error', error, 'AuthRoute');
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
