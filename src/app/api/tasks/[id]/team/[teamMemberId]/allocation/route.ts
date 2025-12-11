import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { sanitizeObject } from '@/lib/utils/sanitization';
import { toTaskId } from '@/types/branded';
import { z } from 'zod';

const allocationUpdateSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  allocatedHours: z.number().min(0).nullable().optional(),
  allocatedPercentage: z.number().min(0).max(100).nullable().optional(),
  actualHours: z.number().min(0).nullable().optional(),
  role: z.enum(['ADMIN', 'REVIEWER', 'EDITOR', 'VIEWER']).optional()
});

/**
 * PUT /api/tasks/[id]/team/[teamMemberId]/allocation
 * Update allocation details for a team member
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; teamMemberId: string }> }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user?.id) {
      return handleApiError(new Error('Unauthorized'), 'API: Update allocation', 401);
    }

    // 2. Parse and validate IDs
    const params = await context.params;
    const taskId = toTaskId(params.id);
    const teamMemberId = parseInt(params.teamMemberId);

    if (isNaN(teamMemberId)) {
      return handleApiError(new Error('Invalid team member ID'), 'Update allocation', 400);
    }

    // 3. Check task access - must be ADMIN to update allocations
    const accessResult = await checkTaskAccess(user.id, taskId, 'ADMIN');
    if (!accessResult.canAccess) {
      return handleApiError(new Error('Only task admins can update allocations'), 'Update allocation', 403);
    }

    // 4. Parse and validate request body
    const rawBody = await request.json();
    const sanitizedBody = sanitizeObject(rawBody);
    const validatedData = allocationUpdateSchema.parse(sanitizedBody);

    // 5. Validate date logic
    if (validatedData.startDate && validatedData.endDate) {
      const start = new Date(validatedData.startDate);
      const end = new Date(validatedData.endDate);
      if (start > end) {
        return handleApiError(
          new Error('End date must be after start date'),
          'Update allocation',
          400
        );
      }
    }

    // 6. Find the team member record
    const teamMember = await prisma.taskTeam.findUnique({
      where: { id: teamMemberId },
      select: {
        id: true,
        taskId: true,
        userId: true
      }
    });

    if (!teamMember || teamMember.taskId !== taskId) {
      return handleApiError(
        new Error('Team member not found'),
        'Update allocation',
        404
      );
    }

    // 7. Update allocation
    const updated = await prisma.taskTeam.update({
      where: { id: teamMemberId },
      data: {
        ...(validatedData.startDate && { startDate: new Date(validatedData.startDate) }),
        ...(validatedData.endDate && { endDate: new Date(validatedData.endDate) }),
        ...(validatedData.allocatedHours !== undefined && { allocatedHours: validatedData.allocatedHours }),
        ...(validatedData.allocatedPercentage !== undefined && { allocatedPercentage: validatedData.allocatedPercentage }),
        ...(validatedData.actualHours !== undefined && { actualHours: validatedData.actualHours }),
        ...(validatedData.role && { role: validatedData.role })
      },
      select: {
        id: true,
        userId: true,
        role: true,
        startDate: true,
        endDate: true,
        allocatedHours: true,
        allocatedPercentage: true,
        actualHours: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });

    return NextResponse.json(
      successResponse({ 
        allocation: {
          ...updated,
          allocatedHours: updated.allocatedHours ? parseFloat(updated.allocatedHours.toString()) : null,
          actualHours: updated.actualHours ? parseFloat(updated.actualHours.toString()) : null
        }
      })
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleApiError(
        new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`),
        'Update allocation',
        400
      );
    }
    return handleApiError(error, 'Update allocation');
  }
}

/**
 * DELETE /api/tasks/[id]/team/[teamMemberId]/allocation
 * Clear allocation details for a team member without removing them from the team
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; teamMemberId: string }> }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user?.id) {
      return handleApiError(new Error('Unauthorized'), 'Clear allocation', 401);
    }

    // 2. Parse and validate IDs
    const params = await context.params;
    const taskId = toTaskId(params.id);
    const teamMemberId = parseInt(params.teamMemberId);

    if (isNaN(teamMemberId)) {
      return handleApiError(new Error('Invalid team member ID'), 'Clear allocation', 400);
    }

    // 3. Check task access - must be ADMIN to clear allocations
    const accessResult = await checkTaskAccess(user.id, taskId, 'ADMIN');
    if (!accessResult.canAccess) {
      return handleApiError(new Error('Only task admins can clear allocations'), 'Clear allocation', 403);
    }

    // 4. Find the team member record
    const teamMember = await prisma.taskTeam.findUnique({
      where: { id: teamMemberId },
      select: {
        id: true,
        taskId: true,
        userId: true
      }
    });

    if (!teamMember || teamMember.taskId !== taskId) {
      return handleApiError(
        new Error('Team member not found'),
        'Clear allocation',
        404
      );
    }

    // 5. Clear allocation fields while keeping team member on task
    const updated = await prisma.taskTeam.update({
      where: { id: teamMemberId },
      data: {
        startDate: null,
        endDate: null,
        allocatedHours: null,
        allocatedPercentage: null,
        actualHours: null
      },
      select: {
        id: true,
        userId: true,
        role: true,
        startDate: true,
        endDate: true,
        allocatedHours: true,
        allocatedPercentage: true,
        actualHours: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });

    return NextResponse.json(
      successResponse({ 
        message: 'Allocation cleared successfully',
        allocation: updated
      })
    );
  } catch (error) {
    return handleApiError(error, 'Clear allocation');
  }
}
