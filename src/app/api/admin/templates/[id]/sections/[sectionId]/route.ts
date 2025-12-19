import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSystemAdmin } from '@/lib/services/auth/authorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { UpdateTemplateSectionSchema } from '@/lib/validation/schemas';
import {
  updateTemplateSection,
  deleteTemplateSection,
} from '@/lib/services/templates/templateService';

/**
 * PUT /api/admin/templates/[id]/sections/[sectionId]
 * Update a template section
 */
export const PUT = secureRoute.mutationWithParams<typeof UpdateTemplateSectionSchema, { id: string; sectionId: string }>({
  feature: Feature.MANAGE_TEMPLATES,
  schema: UpdateTemplateSectionSchema,
  handler: async (request, { user, data, params }) => {
    const hasAdminAccess = await isSystemAdmin(user.id);
    if (!hasAdminAccess) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const sectionIdNum = Number.parseInt(params.sectionId, 10);
    if (Number.isNaN(sectionIdNum)) {
      return NextResponse.json({ success: false, error: 'Invalid section ID' }, { status: 400 });
    }

    const section = await updateTemplateSection(sectionIdNum, data);

    return NextResponse.json(successResponse(section));
  },
});

/**
 * DELETE /api/admin/templates/[id]/sections/[sectionId]
 * Delete a template section
 */
export const DELETE = secureRoute.mutationWithParams<z.ZodAny, { id: string; sectionId: string }>({
  feature: Feature.MANAGE_TEMPLATES,
  handler: async (request, { user, params }) => {
    const hasAdminAccess = await isSystemAdmin(user.id);
    if (!hasAdminAccess) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const sectionIdNum = Number.parseInt(params.sectionId, 10);
    if (Number.isNaN(sectionIdNum)) {
      return NextResponse.json({ success: false, error: 'Invalid section ID' }, { status: 400 });
    }

    await deleteTemplateSection(sectionIdNum);

    return NextResponse.json(successResponse({ deleted: true }));
  },
});
