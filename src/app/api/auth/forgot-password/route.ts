/**
 * POST /api/auth/forgot-password
 * Request a password reset email.
 */

import { type NextRequest } from 'next/server';
import { requestPasswordReset } from '@/services/authService';
import { isValidEmail } from '@/lib/validators';
import { checkAuthRateLimit, getClientIP } from '@/lib/rateLimit';
import { corsJsonResponse, handleOptionsRequest } from '@/lib/cors';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  try {
    // Rate limiting (strict for password reset)
    const ip = getClientIP(request);
    const rateLimited = checkAuthRateLimit(ip);
    if (rateLimited) return rateLimited;

    const body = await request.json();

    if (!body.email || !isValidEmail(body.email)) {
      return corsJsonResponse(
        { success: false, error: 'Valid email address is required' },
        400,
        origin
      );
    }

    const result = await requestPasswordReset(body.email);

    // Always return success to prevent email enumeration
    return corsJsonResponse(
      {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      },
      200,
      origin
    );
  } catch (error) {
    logger.error('Forgot password endpoint error', error, 'AuthRoute');
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
