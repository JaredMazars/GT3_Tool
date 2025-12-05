import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { isSystemAdmin } from '@/lib/services/auth/authorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { copyTemplate } from '@/lib/services/templates/templateService';

/**
 * POST /api/admin/templates/[id]/copy
 * Copy an existing template with all its sections
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAdminAccess = await isSystemAdmin(user.id);
    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const templateId = Number.parseInt(id, 10);

    if (Number.isNaN(templateId)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    const copiedTemplate = await copyTemplate(templateId, user.id);

    return NextResponse.json(successResponse(copiedTemplate), { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/templates/[id]/copy');
  }
}
