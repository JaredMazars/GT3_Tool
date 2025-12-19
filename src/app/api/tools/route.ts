import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

/**
 * GET /api/tools
 * List all tools (with optional filtering by active status)
 */
export const GET = secureRoute.query({
  feature: Feature.MANAGE_TOOLS,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    const tools = await prisma.tool.findMany({
      where: activeOnly ? { active: true } : undefined,
      include: {
        subTabs: { where: { active: true }, orderBy: { sortOrder: 'asc' } },
        serviceLines: { include: { tool: { select: { id: true, name: true, code: true } } } },
        _count: { select: { tasks: true, subTabs: true, serviceLines: true } },
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
  handler: async (request, { user, data }) => {
    const { name, code, description, icon, componentPath, active = true, sortOrder = 0 } = data;

    if (!name || !code || !componentPath) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, code, componentPath' },
        { status: 400 }
      );
    }

    const existingTool = await prisma.tool.findUnique({ where: { code } });

    if (existingTool) {
      return NextResponse.json({ success: false, error: 'Tool with this code already exists' }, { status: 409 });
    }

    const tool = await prisma.tool.create({
      data: { name, code, description, icon, componentPath, active, sortOrder },
      include: {
        subTabs: true,
        serviceLines: true,
        _count: { select: { tasks: true, subTabs: true, serviceLines: true } },
      },
    });

    return NextResponse.json(successResponse(tool), { status: 201 });
  },
});
