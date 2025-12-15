import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/office-codes
 * Fetch distinct office codes from employees and tasks
 */
export async function GET(_request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get distinct office codes from tasks with counts
    const taskOfficeCodes = await prisma.task.groupBy({
      by: ['OfficeCode'],
      _count: {
        id: true,
      },
      where: {
        Active: 'Yes',
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    // Transform to expected format
    const officeCodes = taskOfficeCodes.map(office => ({
      code: office.OfficeCode,
      count: office._count.id,
    }));

    return NextResponse.json(successResponse(officeCodes));
  } catch (error) {
    return handleApiError(error, 'Get Office Codes');
  }
}
