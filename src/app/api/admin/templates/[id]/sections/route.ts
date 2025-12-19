import { NextResponse } from 'next/server';
import { isSystemAdmin } from '@/lib/services/auth/authorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { CreateTemplateSectionSchema } from '@/lib/validation/schemas';
import {
  getTemplateSections,
  createTemplateSection,
} from '@/lib/services/templates/templateService';

/**
 * GET /api/admin/templates/[id]/sections
 * Get all sections for a template
 */
export const GET = secureRoute.queryWithParams<{ id: string }>({
  feature: Feature.MANAGE_TEMPLATES,
  handler: async (request, { user, params }) => {
    const hasAdminAccess = await isSystemAdmin(user.id);
    if (!hasAdminAccess) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const templateId = Number.parseInt(params.id, 10);
    if (Number.isNaN(templateId)) {
      return NextResponse.json({ success: false, error: 'Invalid template ID' }, { status: 400 });
    }

    const sections = await getTemplateSections(templateId);

    return NextResponse.json(successResponse(sections));
  },
});

/**
 * POST /api/admin/templates/[id]/sections
 * Create a new section for a template
 */
export const POST = secureRoute.mutationWithParams<typeof CreateTemplateSectionSchema, { id: string }>({
  feature: Feature.MANAGE_TEMPLATES,
  schema: CreateTemplateSectionSchema,
  handler: async (request, { user, data, params }) => {
    const hasAdminAccess = await isSystemAdmin(user.id);
    if (!hasAdminAccess) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const templateId = Number.parseInt(params.id, 10);
    if (Number.isNaN(templateId)) {
      return NextResponse.json({ success: false, error: 'Invalid template ID' }, { status: 400 });
    }

    const section = await createTemplateSection({
      ...data,
      templateId,
    });

    return NextResponse.json(successResponse(section), { status: 201 });
  },
});
