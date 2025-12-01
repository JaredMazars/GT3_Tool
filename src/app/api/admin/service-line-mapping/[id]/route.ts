import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkUserPermission } from '@/lib/services/permissions/permissionService';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { setExternalMapping } from '@/lib/utils/serviceLineExternal';
import { z } from 'zod';

const updateMappingSchema = z.object({
  masterCode: z.string().nullable(),
});

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    // 3. Get ID from params
    const { id } = await context.params;
    const externalId = parseInt(id, 10);
    
    if (isNaN(externalId)) {
      return NextResponse.json(
        { error: 'Invalid external service line ID' },
        { status: 400 }
      );
    }

    // 4. Validate request body
    const body = await request.json();
    const validation = updateMappingSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error },
        { status: 400 }
      );
    }

    const { masterCode } = validation.data;

    // 5. Update mapping
    const updated = await setExternalMapping(externalId, masterCode);

    return NextResponse.json(successResponse(updated));
  } catch (error) {
    return handleApiError(error, 'PUT /api/admin/service-line-mapping/[id]');
  }
}








