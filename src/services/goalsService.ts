/**
 * Goals Service
 * Handles user trading goals CRUD in PostgreSQL via Prisma.
 */

import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

export interface GoalCreateInput {
  title: string;
  target: number;
  type: 'weekly' | 'monthly';
  deadline: string | Date;
  metric?: string;
}

export interface GoalUpdateInput {
  title?: string;
  target?: number;
  current?: number;
  type?: 'weekly' | 'monthly';
  deadline?: string | Date;
  completed?: boolean;
  metric?: string;
}

export async function getGoals(userId: string) {
  try {
    const goals = await prisma.tradingGoal.findMany({
      where: { userId },
      orderBy: { deadline: 'asc' },
    });
    return { success: true, data: goals };
  } catch (error) {
    logger.error('Failed to get goals', error, 'GoalsService');
    return { success: false, error: 'Failed to retrieve trading goals' };
  }
}

export async function createGoal(userId: string, input: GoalCreateInput) {
  try {
    const goal = await prisma.tradingGoal.create({
      data: {
        userId,
        title: input.title,
        target: Number(input.target),
        type: input.type,
        deadline: new Date(input.deadline),
        metric: input.metric || 'pnl',
        current: 0,
        completed: false,
      },
    });
    return { success: true, data: goal, statusCode: 201 };
  } catch (error) {
    logger.error('Failed to create goal', error, 'GoalsService');
    return { success: false, error: 'Failed to create goal' };
  }
}

export async function updateGoal(userId: string, goalId: string, input: GoalUpdateInput) {
  try {
    const existing = await prisma.tradingGoal.findFirst({
      where: { id: goalId, userId },
    });

    if (!existing) {
      return { success: false, error: 'Goal not found', statusCode: 404 };
    }

    const current = input.current !== undefined ? Number(input.current) : existing.current;
    const target = input.target !== undefined ? Number(input.target) : existing.target;
    const completed = current >= target;

    const updated = await prisma.tradingGoal.update({
      where: { id: goalId },
      data: {
        title: input.title ?? existing.title,
        target,
        current,
        type: input.type ?? existing.type,
        deadline: input.deadline ? new Date(input.deadline) : existing.deadline,
        completed,
        metric: input.metric ?? existing.metric,
      },
    });

    return { success: true, data: updated };
  } catch (error) {
    logger.error('Failed to update goal', error, 'GoalsService');
    return { success: false, error: 'Failed to update goal' };
  }
}

export async function deleteGoal(userId: string, goalId: string) {
  try {
    const existing = await prisma.tradingGoal.findFirst({
      where: { id: goalId, userId },
    });

    if (!existing) {
      return { success: false, error: 'Goal not found', statusCode: 404 };
    }

    await prisma.tradingGoal.delete({
      where: { id: goalId },
    });

    return { success: true, data: { message: 'Goal deleted successfully' } };
  } catch (error) {
    logger.error('Failed to delete goal', error, 'GoalsService');
    return { success: false, error: 'Failed to delete goal' };
  }
}
