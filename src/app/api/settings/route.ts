/**
 * GET  /api/settings - Retrieve user settings
 * POST /api/settings - Update/Save user settings
 */

import { type NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth';
import { getSettings, saveSettings } from '@/services/settingsService';
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

    const result = await getSettings(user.userId);

    if (!result.success) {
      return corsJsonResponse(
        { success: false, error: result.error },
        500,
        origin
      );
    }

    return corsJsonResponse(
      { success: true, settings: result.data },
      200,
      origin
    );
  } catch (error) {
    logger.error('GET /api/settings error', error, 'SettingsRoute');
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
    const result = await saveSettings(user.userId, body);

    if (!result.success) {
      return corsJsonResponse(
        { success: false, error: result.error },
        500,
        origin
      );
    }

    return corsJsonResponse(
      { success: true, settings: result.data },
      200,
      origin
    );
  } catch (error) {
    logger.error('POST /api/settings error', error, 'SettingsRoute');
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
