/**
 * Service Line Master Reorder API Route
 * POST /api/admin/service-line-master/reorder - Batch update sortOrder
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { ReorderServiceLineMasterSchema } from '@/lib/validation/schemas';
import { sanitizeObject } from '@/lib/utils/sanitization';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check feature permission
    const hasAccess = await checkFeature(user.id, Feature.MANAGE_SERVICE_LINES);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to manage service lines' },
        { status: 403 }
      );
    }

    // 3. Parse and validate input
    const body = await request.json();
    const sanitized = sanitizeObject(body);
    const validated = ReorderServiceLineMasterSchema.parse(sanitized);

    // 4. Update sortOrder in a transaction
    await prisma.$transaction(
      validated.items.map((item) =>
        prisma.serviceLineMaster.update({
          where: { code: item.code },
          data: { sortOrder: item.sortOrder },
        })
      )
    );

    // 5. Fetch updated list
    const serviceLineMasters = await prisma.serviceLineMaster.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        code: true,
        name: true,
        description: true,
        active: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(successResponse(serviceLineMasters));
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/service-line-master/reorder');
  }
}
