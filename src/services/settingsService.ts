/**
 * Settings Service
 * Handles user settings operations in PostgreSQL via Prisma.
 */

import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

const DEFAULT_SETTINGS = {
  currency: 'USD',
  timezone: 'UTC',
  defaultRiskPct: 1.0,
  theme: 'dark',
  weeklyTarget: 500,
  monthlyTarget: 2000,
  riskRules: '1. Never risk more than 2% per trade.\n2. Do not overtrade (max 3 trades a day).\n3. Cut losses early and let winners run.',
  tradingChecklist: [
    'HTF bias identified',
    'Liquidity sweep observed',
    'MSS / BOS confirmed on LTF',
    'FVG / Order block entry point set',
    'Risk/Reward ratio is 1:2 or higher',
    'High-impact news checked'
  ],
  riskLimit: 2.0,
  defaultLotSize: 0.1
};

export async function getSettings(userId: string) {
  try {
    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      // Create default settings on first load
      settings = await prisma.userSettings.create({
        data: {
          userId,
          ...DEFAULT_SETTINGS,
        },
      });
      logger.info(`Created default settings for user ${userId}`, 'SettingsService');
    }

    return { success: true, data: settings };
  } catch (error) {
    logger.error('Failed to get settings', error, 'SettingsService');
    return { success: false, error: 'Failed to retrieve settings' };
  }
}

export async function saveSettings(userId: string, input: any) {
  try {
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: {
        currency: input.currency,
        timezone: input.timezone,
        defaultRiskPct: Number(input.defaultRiskPct || 1.0),
        theme: input.theme || 'dark',
        weeklyTarget: Number(input.weeklyTarget || 0),
        monthlyTarget: Number(input.monthlyTarget || 0),
        riskRules: input.riskRules || '',
        tradingChecklist: input.tradingChecklist || [],
        riskLimit: input.riskLimit !== undefined ? Number(input.riskLimit) : null,
        defaultLotSize: input.defaultLotSize !== undefined ? Number(input.defaultLotSize) : null,
        brokerType: input.brokerType || 'none',
        brokerApiKey: input.brokerApiKey || null,
        brokerAccountId: input.brokerAccountId || null,
        brokerEnvironment: input.brokerEnvironment || null,
        brokerConnected: input.brokerConnected !== undefined ? Boolean(input.brokerConnected) : false,
        brokerLastSync: input.brokerLastSync ? new Date(input.brokerLastSync) : null,
      },
      create: {
        userId,
        currency: input.currency || 'USD',
        timezone: input.timezone || 'UTC',
        defaultRiskPct: Number(input.defaultRiskPct || 1.0),
        theme: input.theme || 'dark',
        weeklyTarget: Number(input.weeklyTarget || 0),
        monthlyTarget: Number(input.monthlyTarget || 0),
        riskRules: input.riskRules || '',
        tradingChecklist: input.tradingChecklist || [],
        riskLimit: input.riskLimit !== undefined ? Number(input.riskLimit) : null,
        defaultLotSize: input.defaultLotSize !== undefined ? Number(input.defaultLotSize) : null,
        brokerType: input.brokerType || 'none',
        brokerApiKey: input.brokerApiKey || null,
        brokerAccountId: input.brokerAccountId || null,
        brokerEnvironment: input.brokerEnvironment || null,
        brokerConnected: input.brokerConnected !== undefined ? Boolean(input.brokerConnected) : false,
        brokerLastSync: input.brokerLastSync ? new Date(input.brokerLastSync) : null,
      },
    });

    return { success: true, data: settings };
  } catch (error) {
    logger.error('Failed to save settings', error, 'SettingsService');
    return { success: false, error: 'Failed to update settings' };
  }
}
