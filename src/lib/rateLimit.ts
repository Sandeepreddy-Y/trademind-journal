/**
 * Simple in-memory rate limiter for Next.js API routes.
 * Uses a sliding window approach to limit requests per IP.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically (every 60 seconds)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

const AUTH_CONFIG: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 15 * 60 * 1000, // 15 minutes - stricter for auth endpoints
};

/**
 * Check if a request from the given IP is rate limited.
 * Returns null if allowed, or a Response if rate limited.
 */
export function checkRateLimit(
  ip: string,
  prefix: string = 'general',
  config: RateLimitConfig = DEFAULT_CONFIG
): Response | null {
  const key = `${prefix}:${ip}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return null;
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return Response.json(
      {
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(entry.resetTime / 1000)),
        },
      }
    );
  }

  entry.count++;
  return null;
}

/**
 * Rate limit specifically for authentication endpoints (stricter limits)
 */
export function checkAuthRateLimit(ip: string): Response | null {
  return checkRateLimit(ip, 'auth', AUTH_CONFIG);
}

/**
 * Extract client IP from request headers
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  return '127.0.0.1';
}
