import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';

/**
 * GET /api/tools/available?subServiceLineGroup=TAX-CORP
 * Get tools available for a specific sub-service line group
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const subServiceLineGroup = searchParams.get('subServiceLineGroup');

    if (!subServiceLineGroup) {
      return NextResponse.json(
        { error: 'Missing subServiceLineGroup parameter' },
        { status: 400 }
      );
    }

    // 3. Query tools assigned to this sub-service line group
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
      include: {
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
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    return successResponse(tools);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch available tools');
  }
}
