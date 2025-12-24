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

    const tools = await prisma.tool.findMany({
      where: {
        active: true,
        serviceLines: {
          some: {
            subServiceLineGroup: subServiceLineGroup,
            active: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        icon: true,
        componentPath: true,
        sortOrder: true,
        subTabs: {
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








