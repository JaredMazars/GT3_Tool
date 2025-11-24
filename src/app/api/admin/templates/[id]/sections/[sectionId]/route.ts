import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { isSystemSuperuser } from '@/lib/services/auth/authorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { UpdateTemplateSectionSchema } from '@/lib/validation/schemas';
import {
  updateTemplateSection,
  deleteTemplateSection,
} from '@/lib/services/templates/templateService';

/**
 * PUT /api/admin/templates/[id]/sections/[sectionId]
 * Update a template section
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAdminAccess = await isSystemSuperuser(user.id);
    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { sectionId } = await context.params;
    const sectionIdNum = parseInt(sectionId, 10);

    if (isNaN(sectionIdNum)) {
      return NextResponse.json({ error: 'Invalid section ID' }, { status: 400 });
    }

    const body = await request.json();
    const validated = UpdateTemplateSectionSchema.parse(body);

    const section = await updateTemplateSection(sectionIdNum, validated);

    return NextResponse.json(successResponse(section));
  } catch (error) {
    return handleApiError(error, 'PUT /api/admin/templates/[id]/sections/[sectionId]');
  }
}

/**
 * DELETE /api/admin/templates/[id]/sections/[sectionId]
 * Delete a template section
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAdminAccess = await isSystemSuperuser(user.id);
    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { sectionId } = await context.params;
    const sectionIdNum = parseInt(sectionId, 10);

    if (isNaN(sectionIdNum)) {
      return NextResponse.json({ error: 'Invalid section ID' }, { status: 400 });
    }

    await deleteTemplateSection(sectionIdNum);

    return NextResponse.json(successResponse({ deleted: true }));
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/templates/[id]/sections/[sectionId]');
  }
}

