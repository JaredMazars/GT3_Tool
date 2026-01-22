export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';


/**
 * GET /api/tools/available?subServiceLineGroup=TAX-CORP
 * Get tools available for a specific sub-service line group
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_TASKS,
  handler: async (request) => {
    const { searchParams } = new URL(request.url);
    const subServiceLineGroup = searchParams.get('subServiceLineGroup');

    if (!subServiceLineGroup) {
      throw new AppError(
        400,
        'Missing subServiceLineGroup parameter',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Validate subServiceLineGroup format (alphanumeric with hyphens/underscores)
    if (!/^[A-Za-z0-9_-]+$/.test(subServiceLineGroup)) {
      throw new AppError(
        400,
        'Invalid subServiceLineGroup format',
        ErrorCodes.VALIDATION_ERROR,
        { subServiceLineGroup }
      );
    }

    // Get all service line tools for the group first
    const serviceLineTools = await prisma.serviceLineTool.findMany({
      where: {
        subServiceLineGroup: subServiceLineGroup,
        active: true,
        Tool: {
          active: true,
        },
      },
      select: {
        toolId: true,
      },
    });

    const toolIds = serviceLineTools.map(slt => slt.toolId);

    const tools = await prisma.tool.findMany({
      where: {
        id: { in: toolIds },
        active: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        icon: true,
        componentPath: true,
        sortOrder: true,
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
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(successResponse(tools));
  },
});




