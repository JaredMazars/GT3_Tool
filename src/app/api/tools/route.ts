import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { CreateToolSchema } from '@/lib/validation/schemas';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * GET /api/tools
 * List all tools (with optional filtering by active status)
 */
export const GET = secureRoute.query({
  feature: Feature.MANAGE_TOOLS,
  handler: async (request) => {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    const tools = await prisma.tool.findMany({
      where: activeOnly ? { active: true } : undefined,
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
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(successResponse(tools));
  },
});

/**
 * POST /api/tools
 * Create a new tool
 */
export const POST = secureRoute.mutation({
  feature: Feature.MANAGE_TOOLS,
  schema: CreateToolSchema,
  handler: async (request, { data }) => {
    const { name, code, description, icon, componentPath, active, sortOrder } = data;

    // Check if tool with this code already exists
    const existingTool = await prisma.tool.findUnique({
      where: { code },
      select: { id: true },
    });

    if (existingTool) {
      throw new AppError(
        409,
        'Tool with this code already exists',
        ErrorCodes.CONFLICT,
        { code }
      );
    }

    const tool = await prisma.tool.create({
      data: {
        name,
        code,
        description,
        icon,
        componentPath,
        active: active ?? true,
        sortOrder: sortOrder ?? 0,
        updatedAt: new Date(),
      },
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
          select: {
            id: true,
            name: true,
            code: true,
            icon: true,
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

    return NextResponse.json(successResponse(tool), { status: 201 });
  },
});







