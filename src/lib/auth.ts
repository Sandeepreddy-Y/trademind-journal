import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { type NextRequest } from 'next/server';

// ============================================
// Constants
// ============================================
const JWT_SECRET = process.env.JWT_SECRET || 'trademind-default-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const BCRYPT_SALT_ROUNDS = 12;

// ============================================
// Types
// ============================================
export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
}

// ============================================
// Password Hashing
// ============================================

/**
 * Hash a plain text password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Compare a plain text password against a bcrypt hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================
// JWT Token Management
// ============================================

/**
 * Generate a JWT token for an authenticated user
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET as jwt.Secret, {
    expiresIn: JWT_EXPIRES_IN as unknown as number,
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

// ============================================
// Request Authentication
// ============================================

/**
 * Extract and verify JWT from the Authorization header of a request.
 * Returns the authenticated user payload or null if invalid/missing.
 */
export function authenticateRequest(request: NextRequest): AuthenticatedUser | null {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    const decoded = verifyToken(token);

    return {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
    };
  } catch {
    return null;
  }
}

/**
 * Helper to return a 401 Unauthorized response
 */
export function unauthorizedResponse(message: string = 'Authentication required') {
  return Response.json(
    { success: false, error: message },
    { status: 401 }
  );
}

/**
 * Helper to return a 403 Forbidden response
 */
export function forbiddenResponse(message: string = 'Access denied') {
  return Response.json(
    { success: false, error: message },
    { status: 403 }
  );
}
