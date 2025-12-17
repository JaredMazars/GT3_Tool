import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError, AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { z } from 'zod';
import { sanitizeObject } from '@/lib/utils/sanitization';

const CheckDuplicateSchema = z.object({
  servLineCode: z.string().min(1),
  year: z.number().int().min(2000).max(2100),
  stdTaskCode: z.string().min(1).max(10),
});

/**
 * POST /api/tasks/check-duplicate
 * 
 * Checks for existing tasks with similar task codes and calculates next increment
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const hasPermission = await checkFeature(user.id, Feature.MANAGE_TASKS);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions to create tasks' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const sanitizedData = sanitizeObject(body);
    const validatedData = CheckDuplicateSchema.parse(sanitizedData);

    // Build the task code pattern: [3 char ServLine][2 digit Year][3 char StdTaskCode]
    const servPrefix = validatedData.servLineCode.substring(0, 3).toUpperCase();
    const yearSuffix = validatedData.year.toString().slice(-2);
    const stdCode = validatedData.stdTaskCode.substring(0, 3).toUpperCase();
    const basePattern = `${servPrefix}${yearSuffix}${stdCode}`;

    // Find all tasks that start with this pattern
    const existingTasks = await prisma.task.findMany({
      where: {
        TaskCode: {
          startsWith: basePattern,
        },
      },
      select: {
        id: true,
        TaskCode: true,
        TaskDesc: true,
        taskYear: true,
        Active: true,
        Client: {
          select: {
            clientCode: true,
            clientNameFull: true,
          },
        },
      },
      orderBy: {
        TaskCode: 'desc',
      },
    });

    // Calculate next increment
    let maxIncrement = 0;
    if (existingTasks.length > 0) {
      // Extract increment numbers from existing task codes
      for (const task of existingTasks) {
        // Task code format: XXX24ABC01
        // Extract last 2 digits
        const incrementStr = task.TaskCode.slice(-2);
        const increment = parseInt(incrementStr, 10);
        if (!isNaN(increment) && increment > maxIncrement) {
          maxIncrement = increment;
        }
      }
    }

    const nextIncrement = maxIncrement + 1;
    const nextIncrementStr = nextIncrement.toString().padStart(2, '0');
    const nextTaskCode = `${basePattern}${nextIncrementStr}`;

    // Return results
    return NextResponse.json(
      successResponse({
        exists: existingTasks.length > 0,
        count: existingTasks.length,
        nextIncrement: nextIncrementStr,
        nextTaskCode,
        basePattern,
        existingTasks: existingTasks.map(task => ({
          id: task.id,
          taskCode: task.TaskCode,
          taskDesc: task.TaskDesc,
          taskYear: task.taskYear,
          active: task.Active === 'Yes',
          clientCode: task.Client?.clientCode,
          clientName: task.Client?.clientNameFull,
        })),
      })
    );
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return handleApiError(
        new AppError(400, message, ErrorCodes.VALIDATION_ERROR),
        'Check Duplicate Task Code'
      );
    }

    return handleApiError(error, 'Check Duplicate Task Code');
  }
}

