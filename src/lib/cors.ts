/**
 * CORS configuration and helpers for API routes.
 */

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

/**
 * Create CORS headers for API responses
 */
export function getCorsHeaders(origin?: string | null): HeadersInit {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Create a CORS-enabled JSON response
 */
export function corsJsonResponse(
  data: unknown,
  status: number = 200,
  origin?: string | null
): Response {
  return Response.json(data, {
    status,
    headers: getCorsHeaders(origin),
  });
}

/**
 * Handle OPTIONS preflight requests
 */
export function handleOptionsRequest(origin?: string | null): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}
