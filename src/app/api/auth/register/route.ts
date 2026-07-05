/**
 * POST /api/auth/register
 * Register a new user with email and password.
 */

import { type NextRequest } from 'next/server';
import { registerUser } from '@/services/authService';
import { validateRegisterInput } from '@/lib/validators';
import { checkAuthRateLimit, getClientIP } from '@/lib/rateLimit';
import { corsJsonResponse, handleOptionsRequest } from '@/lib/cors';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  try {
    // Rate limiting
    const ip = getClientIP(request);
    const rateLimited = checkAuthRateLimit(ip);
    if (rateLimited) return rateLimited;

    // Parse body
    const body = await request.json();

    // Validate input
    const validation = validateRegisterInput(body);
    if (!validation.valid) {
      return corsJsonResponse(
        { success: false, errors: validation.errors },
        400,
        origin
      );
    }

    // Register user
    const result = await registerUser({
      name: body.name,
      email: body.email,
      password: body.password,
    });

    if (!result.success) {
      return corsJsonResponse(
        { success: false, error: result.error },
        409,
        origin
      );
    }

    return corsJsonResponse(
      {
        success: true,
        message: 'Registration successful',
        token: result.token,
        user: result.user,
      },
      201,
      origin
    );
  } catch (error) {
    logger.error('Register endpoint error', error, 'AuthRoute');
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
