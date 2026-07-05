/**
 * Input validation utilities for API endpoints.
 * Provides reusable validators for common field types.
 */

// ============================================
// Types
// ============================================
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================
// Email Validation
// ============================================
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 254;
}

// ============================================
// Password Validation
// ============================================
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (password.length > 128) {
    return { valid: false, message: 'Password must not exceed 128 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
}

// ============================================
// Registration Validation
// ============================================
export function validateRegisterInput(data: {
  name?: string;
  email?: string;
  password?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  if (data.name && data.name.trim().length > 100) {
    errors.push('Name must not exceed 100 characters');
  }

  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Valid email address is required');
  }

  if (!data.password) {
    errors.push('Password is required');
  } else {
    const passwordCheck = isValidPassword(data.password);
    if (!passwordCheck.valid && passwordCheck.message) {
      errors.push(passwordCheck.message);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================
// Login Validation
// ============================================
export function validateLoginInput(data: {
  email?: string;
  password?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Valid email address is required');
  }

  if (!data.password || data.password.trim().length === 0) {
    errors.push('Password is required');
  }

  return { valid: errors.length === 0, errors };
}

// ============================================
// Trade Validation
// ============================================
export function validateTradeInput(data: {
  symbol?: string;
  direction?: string;
  volume?: number;
  entryPrice?: number;
  exitPrice?: number;
  openTime?: string;
  closeTime?: string;
  profit?: number;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.symbol || data.symbol.trim().length === 0) {
    errors.push('Symbol is required');
  }

  if (!data.direction || !['Buy', 'Sell'].includes(data.direction)) {
    errors.push('Direction must be "Buy" or "Sell"');
  }

  if (data.volume === undefined || data.volume <= 0) {
    errors.push('Volume must be a positive number');
  }

  if (data.entryPrice === undefined || data.entryPrice <= 0) {
    errors.push('Entry price must be a positive number');
  }

  if (data.exitPrice === undefined || data.exitPrice <= 0) {
    errors.push('Exit price must be a positive number');
  }

  if (!data.openTime) {
    errors.push('Open time is required');
  }

  if (!data.closeTime) {
    errors.push('Close time is required');
  }

  if (data.profit === undefined || typeof data.profit !== 'number') {
    errors.push('Profit must be a number');
  }

  return { valid: errors.length === 0, errors };
}

// ============================================
// Sanitization
// ============================================

/**
 * Strip HTML tags from a string to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/**
 * Validate that a file has an allowed extension
 */
export function isValidFileExtension(filename: string, allowedExtensions: string[]): boolean {
  const ext = filename.toLowerCase().split('.').pop();
  return ext ? allowedExtensions.includes(`.${ext}`) : false;
}
