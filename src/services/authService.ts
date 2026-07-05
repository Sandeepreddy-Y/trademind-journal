/**
 * Authentication Service
 * Handles user registration, login, and profile management.
 */

import prisma from '@/lib/prisma';
import { hashPassword, comparePassword, generateToken } from '@/lib/auth';
import logger from '@/lib/logger';

// ============================================
// Types
// ============================================
export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface GoogleAuthInput {
  email: string;
  name: string;
  avatar?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    provider: string;
    createdAt: Date;
  };
  error?: string;
}

// ============================================
// Register
// ============================================
export async function registerUser(input: RegisterInput): Promise<AuthResponse> {
  try {
    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      return { success: false, error: 'An account with this email already exists' };
    }

    // Hash password
    const hashedPassword = await hashPassword(input.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email: input.email.toLowerCase().trim(),
        password: hashedPassword,
        provider: 'email',
      },
    });

    // Generate JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    logger.info(`User registered: ${user.email}`, 'AuthService');

    return {
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        provider: user.provider,
        createdAt: user.createdAt,
      },
    };
  } catch (error) {
    logger.error('Registration failed', error, 'AuthService');
    return { success: false, error: 'Registration failed. Please try again.' };
  }
}

// ============================================
// Login
// ============================================
export async function loginUser(input: LoginInput): Promise<AuthResponse> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    if (!user.password) {
      return {
        success: false,
        error: 'This account uses Google sign-in. Please use Google to log in.',
      };
    }

    // Compare passwords
    const isValid = await comparePassword(input.password, user.password);
    if (!isValid) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Generate JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    logger.info(`User logged in: ${user.email}`, 'AuthService');

    return {
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        provider: user.provider,
        createdAt: user.createdAt,
      },
    };
  } catch (error) {
    logger.error('Login failed', error, 'AuthService');
    return { success: false, error: 'Login failed. Please try again.' };
  }
}

// ============================================
// Google Auth
// ============================================
export async function googleAuth(input: GoogleAuthInput): Promise<AuthResponse> {
  try {
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (user) {
      // Update avatar if provided
      if (input.avatar && input.avatar !== user.avatar) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { avatar: input.avatar },
        });
      }
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          name: input.name,
          email: input.email.toLowerCase(),
          provider: 'google',
          avatar: input.avatar || null,
        },
      });
      logger.info(`Google user registered: ${user.email}`, 'AuthService');
    }

    // Generate JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return {
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        provider: user.provider,
        createdAt: user.createdAt,
      },
    };
  } catch (error) {
    logger.error('Google auth failed', error, 'AuthService');
    return { success: false, error: 'Google authentication failed. Please try again.' };
  }
}

// ============================================
// Get User Profile
// ============================================
export async function getUserProfile(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        provider: true,
        createdAt: true,
      },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, user };
  } catch (error) {
    logger.error('Get profile failed', error, 'AuthService');
    return { success: false, error: 'Failed to fetch profile' };
  }
}

// ============================================
// Request Password Reset
// ============================================
export async function requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      logger.debug(`Password reset requested for non-existent email: ${email}`, 'AuthService');
      return { success: true };
    }

    if (user.provider === 'google') {
      // Don't reveal account type - just return success
      return { success: true };
    }

    // In production, you would:
    // 1. Generate a reset token
    // 2. Save it to the database with an expiry
    // 3. Send an email with the reset link
    // For now, log it
    logger.info(`Password reset requested for: ${email}`, 'AuthService');

    // TODO: Implement email sending with a service like SendGrid, Resend, etc.
    // const resetToken = crypto.randomUUID();
    // await sendResetEmail(email, resetToken);

    return { success: true };
  } catch (error) {
    logger.error('Password reset request failed', error, 'AuthService');
    return { success: false, error: 'Failed to process password reset request' };
  }
}
