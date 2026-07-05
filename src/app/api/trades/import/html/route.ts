/**
 * POST /api/trades/import/html
 * Upload and parse an MT5 HTML Trade History Report.
 * 
 * Accepts multipart/form-data with a .html or .htm file.
 * Parses the Positions table, extracts all completed trades,
 * prevents duplicates via ticket number, and saves to database.
 */

import { type NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth';
import { parseMT5HTML } from '@/services/mt5Parser';
import { importMT5Trades } from '@/services/tradeService';
import { isValidFileExtension } from '@/lib/validators';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';
import { corsJsonResponse, handleOptionsRequest } from '@/lib/cors';
import logger from '@/lib/logger';

// Maximum file size: 10 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  try {
    // Rate limiting
    const ip = getClientIP(request);
    const rateLimited = checkRateLimit(ip, 'import');
    if (rateLimited) return rateLimited;

    // Authenticate
    const user = authenticateRequest(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // Parse multipart form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return corsJsonResponse(
        { success: false, error: 'Invalid form data. Please upload a file.' },
        400,
        origin
      );
    }

    const file = formData.get('file') as File | null;

    if (!file) {
      return corsJsonResponse(
        { success: false, error: 'No file uploaded. Please select an MT5 HTML report.' },
        400,
        origin
      );
    }

    // Validate file extension
    if (!isValidFileExtension(file.name, ['.html', '.htm'])) {
      return corsJsonResponse(
        {
          success: false,
          error: 'Invalid file type. Only .html and .htm files are accepted.',
        },
        400,
        origin
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return corsJsonResponse(
        {
          success: false,
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
        },
        400,
        origin
      );
    }

    // Read file content
    const htmlContent = await file.text();

    if (!htmlContent || htmlContent.trim().length === 0) {
      return corsJsonResponse(
        { success: false, error: 'The uploaded file is empty.' },
        400,
        origin
      );
    }

    logger.info(
      `MT5 Import: User ${user.email} uploading file "${file.name}" (${(file.size / 1024).toFixed(1)}KB)`,
      'ImportRoute'
    );

    // Parse the HTML report
    const parseResult = parseMT5HTML(htmlContent);

    if (!parseResult.success || parseResult.trades.length === 0) {
      return corsJsonResponse(
        {
          success: false,
          error: 'No valid trades found in the uploaded report.',
          details: parseResult.errors,
        },
        422,
        origin
      );
    }

    // Import parsed trades to database
    const importResult = await importMT5Trades(user.userId, parseResult.trades);

    if (!importResult.success) {
      return corsJsonResponse(
        { success: false, error: importResult.error },
        500,
        origin
      );
    }

    logger.info(
      `MT5 Import completed: ${importResult.data?.imported} imported, ${importResult.data?.skipped} duplicates skipped`,
      'ImportRoute'
    );

    return corsJsonResponse(
      {
        success: true,
        message: `Successfully imported ${importResult.data?.imported} trades.`,
        data: {
          totalFound: parseResult.totalFound,
          totalParsed: parseResult.totalParsed,
          imported: importResult.data?.imported,
          skipped: importResult.data?.skipped,
          parseErrors: parseResult.errors.length > 0 ? parseResult.errors : undefined,
          importErrors: importResult.data?.errors,
        },
      },
      200,
      origin
    );
  } catch (error) {
    logger.error('MT5 Import endpoint error', error, 'ImportRoute');
    return corsJsonResponse(
      { success: false, error: 'Internal server error during import' },
      500,
      origin
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleOptionsRequest(request.headers.get('origin'));
}
