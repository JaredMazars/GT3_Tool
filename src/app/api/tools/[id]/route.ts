import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse, parseToolId } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { UpdateToolSchema } from '@/lib/validation/schemas';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * GET /api/tools/[id]
 * Get a specific tool by ID
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.MANAGE_TOOLS,
  handler: async (request, { params }) => {
    const toolId = parseToolId(params.id);

    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        icon: true,
        componentPath: true,
        active: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        ToolSubTab: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            code: true,
            icon: true,
            componentPath: true,
            active: true,
            sortOrder: true,
          },
        },
        ServiceLineTool: {
          select: {
            subServiceLineGroup: true,
          },
        },
        _count: {
          select: {
            TaskTool: true,
            ToolSubTab: true,
            ServiceLineTool: true,
          },
        },
      },
    });

    if (!tool) {
      throw new AppError(404, 'Tool not found', ErrorCodes.NOT_FOUND, { toolId });
    }

    return NextResponse.json(successResponse(tool));
  },
});

/**
 * PUT /api/tools/[id]
 * Update a tool
 */
export const PUT = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TOOLS,
  schema: UpdateToolSchema,
  handler: async (request, { params, data }) => {
    const toolId = parseToolId(params.id);
    const { name, code, description, icon, componentPath, active, sortOrder } = data;

    // Check if tool exists
    const existingTool = await prisma.tool.findUnique({
      where: { id: toolId },
      select: { id: true, code: true },
    });

    if (!existingTool) {
      throw new AppError(404, 'Tool not found', ErrorCodes.NOT_FOUND, { toolId });
    }

    // Check if code is changing and already exists
    if (code && code !== existingTool.code) {
      const codeExists = await prisma.tool.findUnique({
        where: { code },
        select: { id: true },
      });

      if (codeExists) {
        throw new AppError(
          409,
          'Tool with this code already exists',
          ErrorCodes.CONFLICT,
          { code }
        );
      }
    }

    // Build update data explicitly (no spreading)
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (componentPath !== undefined) updateData.componentPath = componentPath;
    if (active !== undefined) updateData.active = active;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const tool = await prisma.tool.update({
      where: { id: toolId },
      data: updateData,
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        icon: true,
        componentPath: true,
        active: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        ToolSubTab: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            code: true,
            icon: true,
            componentPath: true,
            active: true,
            sortOrder: true,
          },
        },
        ServiceLineTool: {
          select: {
            subServiceLineGroup: true,
          },
        },
        _count: {
          select: {
            TaskTool: true,
            ToolSubTab: true,
            ServiceLineTool: true,
          },
        },
      },
    });

    return NextResponse.json(successResponse(tool));
  },
});

/**
 * DELETE /api/tools/[id]
 * Delete a tool
 */
export const DELETE = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TOOLS,
  handler: async (request, { params }) => {
    const toolId = parseToolId(params.id);

    // Check if tool exists and get task count
    const existingTool = await prisma.tool.findUnique({
      where: { id: toolId },
      select: {
        id: true,
        _count: {
          select: {
            TaskTool: true,
          },
        },
      },
    });

    if (!existingTool) {
      throw new AppError(404, 'Tool not found', ErrorCodes.NOT_FOUND, { toolId });
    }

    // Check if tool is in use
    if (existingTool._count.TaskTool > 0) {
      throw new AppError(
        400,
        'Cannot delete tool that is assigned to tasks. Deactivate it instead.',
        ErrorCodes.VALIDATION_ERROR,
        { toolId, tasksCount: existingTool._count.TaskTool }
      );
    }

    // Delete tool (cascade will handle subTabs, serviceLines, etc.)
    await prisma.tool.delete({
      where: { id: toolId },
    });

    return NextResponse.json(successResponse({ message: 'Tool deleted successfully' }));
  },
});








