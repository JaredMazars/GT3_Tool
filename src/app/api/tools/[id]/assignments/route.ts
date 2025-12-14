import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { sanitizeObject } from '@/lib/utils/sanitization';

/**
 * GET /api/tools/[id]/assignments
 * Get all SubServiceLineGroup assignments for a tool
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse ID
    const toolId = parseInt(params.id);
    if (isNaN(toolId)) {
      return NextResponse.json({ error: 'Invalid tool ID' }, { status: 400 });
    }

    // 3. Check feature permission
    const hasPermission = await checkFeature(user.id, Feature.MANAGE_TOOLS);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Verify tool exists
    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      select: { id: true, name: true },
    });

    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    // 5. Get assignments
    const assignments = await prisma.serviceLineTool.findMany({
      where: {
        toolId,
        active: true,
      },
      select: {
        id: true,
        subServiceLineGroup: true,
        active: true,
        createdAt: true,
      },
      orderBy: {
        subServiceLineGroup: 'asc',
      },
    });

    return successResponse({
      tool,
      assignments: assignments.map((a) => a.subServiceLineGroup),
    });
  } catch (error) {
    return handleApiError(error, 'Failed to fetch tool assignments');
  }
}

/**
 * PUT /api/tools/[id]/assignments
 * Update assignments (replace all with new list)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse ID
    const toolId = parseInt(params.id);
    if (isNaN(toolId)) {
      return NextResponse.json({ error: 'Invalid tool ID' }, { status: 400 });
    }

    // 3. Check feature permission
    const hasPermission = await checkFeature(user.id, Feature.MANAGE_TOOLS);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Parse and sanitize body
    const body = await request.json();
    const sanitizedData = sanitizeObject(body);
    const { subServiceLineGroups } = sanitizedData;

    if (!Array.isArray(subServiceLineGroups)) {
      return NextResponse.json(
        { error: 'subServiceLineGroups must be an array' },
        { status: 400 }
      );
    }

    // 5. Verify tool exists
    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      select: { id: true, name: true },
    });

    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    // 6. Check if any tasks are using this tool with removed assignments
    const existingAssignments = await prisma.serviceLineTool.findMany({
      where: { toolId },
      select: { subServiceLineGroup: true },
    });

    const existingGroups = existingAssignments.map((a) => a.subServiceLineGroup);
    const removedGroups = existingGroups.filter((g) => !subServiceLineGroups.includes(g));

    if (removedGroups.length > 0) {
      // Check if any tasks from these groups are using this tool
      const tasksUsingTool = await prisma.taskTool.count({
        where: {
          toolId,
        },
      });

      if (tasksUsingTool > 0) {
        return NextResponse.json(
          {
            error: `Cannot remove assignments. ${tasksUsingTool} task(s) are currently using this tool. Please remove the tool from those tasks first.`,
          },
          { status: 400 }
        );
      }
    }

    // 7. Update assignments in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete all existing assignments
      await tx.serviceLineTool.deleteMany({
        where: { toolId },
      });

      // Create new assignments
      if (subServiceLineGroups.length > 0) {
        await tx.serviceLineTool.createMany({
          data: subServiceLineGroups.map((group: string) => ({
            toolId,
            subServiceLineGroup: group,
            active: true,
          })),
        });
      }
    });

    // 8. Fetch updated assignments
    const updatedAssignments = await prisma.serviceLineTool.findMany({
      where: { toolId },
      select: {
        subServiceLineGroup: true,
      },
      orderBy: {
        subServiceLineGroup: 'asc',
      },
    });

    return successResponse({
      tool,
      assignments: updatedAssignments.map((a) => a.subServiceLineGroup),
    });
  } catch (error) {
    return handleApiError(error, 'Failed to update tool assignments');
  }
}
