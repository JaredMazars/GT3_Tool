import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse, parseTaskId, parseNumericId } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AddToolToTaskSchema } from '@/lib/validation/schemas';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * GET /api/tools/task/[taskId]
 * Get all tools assigned to a task
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'taskId',
  taskRole: 'VIEWER',
  handler: async (request, { params }) => {
    const taskId = parseTaskId(params.taskId);

    const taskTools = await prisma.taskTool.findMany({
      where: { taskId },
      select: {
        id: true,
        taskId: true,
        toolId: true,
        sortOrder: true,
        addedBy: true,
        createdAt: true,
        Tool: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
            icon: true,
            componentPath: true,
            active: true,
            ToolSubTab: {
              where: { active: true },
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                name: true,
                code: true,
                icon: true,
                sortOrder: true,
              },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(successResponse(taskTools));
  },
});

/**
 * POST /api/tools/task/[taskId]
 * Add a tool to a task
 */
export const POST = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'taskId',
  taskRole: 'EDITOR',
  schema: AddToolToTaskSchema,
  handler: async (request, { user, params, data }) => {
    const taskId = parseTaskId(params.taskId);
    const { toolId, sortOrder } = data;

    // Verify tool exists and is active
    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      select: { id: true, active: true },
    });

    if (!tool) {
      throw new AppError(404, 'Tool not found', ErrorCodes.NOT_FOUND, { toolId });
    }

    if (!tool.active) {
      throw new AppError(
        400,
        'Cannot add inactive tool to task',
        ErrorCodes.VALIDATION_ERROR,
        { toolId }
      );
    }

    // Check if tool is already assigned
    const existing = await prisma.taskTool.findUnique({
      where: {
        taskId_toolId: {
          taskId,
          toolId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new AppError(
        409,
        'Tool already assigned to this task',
        ErrorCodes.CONFLICT,
        { taskId, toolId }
      );
    }

    // Add tool to task
    const taskTool = await prisma.taskTool.create({
      data: {
        taskId,
        toolId,
        addedBy: user.id,
        sortOrder: sortOrder ?? 0,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        taskId: true,
        toolId: true,
        sortOrder: true,
        addedBy: true,
        createdAt: true,
        Tool: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
            icon: true,
            componentPath: true,
            active: true,
            ToolSubTab: {
              where: { active: true },
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                name: true,
                code: true,
                icon: true,
                sortOrder: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(successResponse(taskTool), { status: 201 });
  },
});

/**
 * DELETE /api/tools/task/[taskId]?toolId=123
 * Remove a tool from a task
 */
export const DELETE = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'taskId',
  taskRole: 'EDITOR',
  handler: async (request, { params }) => {
    const taskId = parseTaskId(params.taskId);

    // Parse query parameter
    const { searchParams } = new URL(request.url);
    const toolIdParam = searchParams.get('toolId');

    if (!toolIdParam) {
      throw new AppError(
        400,
        'Missing toolId parameter',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const toolId = parseNumericId(toolIdParam, 'Tool');

    // Check if assignment exists
    const taskTool = await prisma.taskTool.findUnique({
      where: {
        taskId_toolId: {
          taskId,
          toolId,
        },
      },
      select: { id: true },
    });

    if (!taskTool) {
      throw new AppError(
        404,
        'Tool not assigned to this task',
        ErrorCodes.NOT_FOUND,
        { taskId, toolId }
      );
    }

    // Remove tool from task
    await prisma.taskTool.delete({
      where: {
        taskId_toolId: {
          taskId,
          toolId,
        },
      },
    });

    return NextResponse.json(successResponse({ message: 'Tool removed from task successfully' }));
  },
});








