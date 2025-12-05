import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { toTaskId } from '@/types/branded';
import { z } from 'zod';

const UpdateChecklistItemSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'NOT_APPLICABLE']),
  completedAt: z.string().datetime().optional(),
});

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const taskId = toTaskId(params.id);
    const itemId = Number.parseInt(params.itemId);

    // Check project access (requires EDITOR role or higher)
    const hasAccess = await checkTaskAccess(user.id, taskId, 'EDITOR');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validated = UpdateChecklistItemSchema.parse(body);

    interface UpdateData {
      status: string;
      completedAt?: Date;
      completedBy?: string;
    }

    const updateData: UpdateData = {
      status: validated.status,
    };

    if (validated.status === 'COMPLETED' && validated.completedAt) {
      updateData.completedAt = new Date(validated.completedAt);
      updateData.completedBy = user.id;
    }

    const item = await prisma.complianceChecklist.update({
      where: { id: itemId },
      data: updateData,
    });

    return NextResponse.json(successResponse(item));
  } catch (error) {
    return handleApiError(error, 'PUT /api/tasks/[id]/compliance-checklist/[itemId]');
  }
}

