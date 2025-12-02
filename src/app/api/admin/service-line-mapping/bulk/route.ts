import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkUserPermission } from '@/lib/services/permissions/permissionService';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const bulkMappingSchema = z.object({
  externalIds: z.array(z.number()).min(1, 'At least one external ID is required'),
  masterCode: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check permission
    const hasPermission = await checkUserPermission(
      user.id,
      'admin.service-line-mapping',
      'UPDATE'
    );
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Validate request body
    const body = await request.json();
    const validation = bulkMappingSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error },
        { status: 400 }
      );
    }

    const { externalIds, masterCode } = validation.data;

    // 4. Bulk update mappings
    const result = await prisma.serviceLineExternal.updateMany({
      where: {
        id: {
          in: externalIds,
        },
      },
      data: {
        masterCode,
      },
    });

    return NextResponse.json(
      successResponse({
        updated: result.count,
        masterCode,
      })
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/service-line-mapping/bulk');
  }
}










