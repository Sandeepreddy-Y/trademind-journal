/**
 * POST /api/auth/login
 * Authenticate user with email and password, returns JWT token.
 */

import { type NextRequest } from 'next/server';
import { loginUser, googleAuth } from '@/services/authService';
import { validateLoginInput } from '@/lib/validators';
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

    const body = await request.json();

    // Check if this is a Google auth request
    if (body.provider === 'google') {
      if (!body.email || !body.name) {
        return corsJsonResponse(
          { success: false, error: 'Email and name are required for Google authentication' },
          400,
          origin
        );
      }

      const result = await googleAuth({
        email: body.email,
        name: body.name,
        avatar: body.avatar,
      });

      if (!result.success) {
        return corsJsonResponse(
          { success: false, error: result.error },
          401,
          origin
        );
      }

      return corsJsonResponse(
        {
          success: true,
          message: 'Google authentication successful',
          token: result.token,
          user: result.user,
        },
        200,
        origin
      );
    }

    // Standard email/password login
    const validation = validateLoginInput(body);
    if (!validation.valid) {
      return corsJsonResponse(
        { success: false, errors: validation.errors },
        400,
        origin
      );
    }

    const result = await loginUser({
      email: body.email,
      password: body.password,
    });

    if (!result.success) {
      return corsJsonResponse(
        { success: false, error: result.error },
        401,
        origin
      );
    }

    return corsJsonResponse(
      {
        success: true,
        message: 'Login successful',
        token: result.token,
        user: result.user,
      },
      200,
      origin
    );
  } catch (error) {
    logger.error('Login endpoint error', error, 'AuthRoute');
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
