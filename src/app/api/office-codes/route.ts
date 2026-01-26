import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute } from '@/lib/api/secureRoute';

export const dynamic = 'force-dynamic';

/**
 * GET /api/office-codes
 * Fetch distinct office codes from employees and tasks
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const taskOfficeCodes = await prisma.task.groupBy({
      by: ['OfficeCode'],
      _count: { id: true },
      where: { Active: 'Yes' },
      orderBy: { _count: { id: 'desc' } },
    });

    const officeCodes = taskOfficeCodes.map(office => ({
      code: office.OfficeCode,
      count: office._count.id,
    }));

    return NextResponse.json(successResponse(officeCodes));
  },
});
