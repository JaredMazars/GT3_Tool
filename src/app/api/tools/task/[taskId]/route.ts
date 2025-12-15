import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { sanitizeObject } from '@/lib/utils/sanitization';

/**
 * GET /api/tools/task/[taskId]
 * Get all tools assigned to a task
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse task ID
    const taskId = parseInt(params.taskId);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    // 3. Verify task exists and user has access
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // 4. Get task tools
    const taskTools = await prisma.taskTool.findMany({
      where: { taskId },
      include: {
        tool: {
          include: {
            subTabs: {
              where: { active: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(successResponse(taskTools));
  } catch (error) {
    return handleApiError(error, 'Failed to fetch task tools');
  }
}

/**
 * POST /api/tools/task/[taskId]
 * Add a tool to a task
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse task ID
    const taskId = parseInt(params.taskId);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    // 3. Parse and sanitize body
    const body = await request.json();
    const sanitizedData = sanitizeObject(body);
    const { toolId, sortOrder = 0 } = sanitizedData;

    if (!toolId) {
      return NextResponse.json({ error: 'Missing toolId' }, { status: 400 });
    }

    // 4. Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // 5. Verify tool exists and is active
    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
    });

    if (!tool || !tool.active) {
      return NextResponse.json({ error: 'Tool not found or inactive' }, { status: 404 });
    }

    // 6. Check if tool is already assigned
    const existing = await prisma.taskTool.findUnique({
      where: {
        taskId_toolId: {
          taskId,
          toolId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Tool already assigned to this task' },
        { status: 409 }
      );
    }

    // 7. Add tool to task
    const taskTool = await prisma.taskTool.create({
      data: {
        taskId,
        toolId,
        addedBy: user.id,
        sortOrder,
      },
      include: {
        tool: {
          include: {
            subTabs: {
              where: { active: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    return NextResponse.json(successResponse(taskTool), { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to add tool to task');
  }
}

/**
 * DELETE /api/tools/task/[taskId]?toolId=123
 * Remove a tool from a task
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse task ID
    const taskId = parseInt(params.taskId);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    // 3. Parse query parameter
    const { searchParams } = new URL(request.url);
    const toolIdParam = searchParams.get('toolId');
    
    if (!toolIdParam) {
      return NextResponse.json({ error: 'Missing toolId parameter' }, { status: 400 });
    }

    const toolId = parseInt(toolIdParam);
    if (isNaN(toolId)) {
      return NextResponse.json({ error: 'Invalid tool ID' }, { status: 400 });
    }

    // 4. Check if assignment exists
    const taskTool = await prisma.taskTool.findUnique({
      where: {
        taskId_toolId: {
          taskId,
          toolId,
        },
      },
    });

    if (!taskTool) {
      return NextResponse.json({ error: 'Tool not assigned to this task' }, { status: 404 });
    }

    // 5. Remove tool from task
    await prisma.taskTool.delete({
      where: {
        taskId_toolId: {
          taskId,
          toolId,
        },
      },
    });

    return NextResponse.json(successResponse({ message: 'Tool removed from task successfully' }));
  } catch (error) {
    return handleApiError(error, 'Failed to remove tool from task');
  }
}
