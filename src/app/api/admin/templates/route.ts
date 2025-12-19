import { NextResponse } from 'next/server';
import { isSystemAdmin } from '@/lib/services/auth/authorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { CreateTemplateSchema } from '@/lib/validation/schemas';
import {
  getTemplates,
  createTemplate,
  type TemplateFilter,
} from '@/lib/services/templates/templateService';

/**
 * GET /api/admin/templates
 * List all templates with optional filtering
 */
export const GET = secureRoute.query({
  feature: Feature.MANAGE_TEMPLATES,
  handler: async (request, { user }) => {
    const hasAdminAccess = await isSystemAdmin(user.id);
    if (!hasAdminAccess) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filter: TemplateFilter = {
      type: searchParams.get('type') || undefined,
      serviceLine: searchParams.get('serviceLine') || undefined,
      projectType: searchParams.get('projectType') || undefined,
      active: searchParams.get('active') ? searchParams.get('active') === 'true' : undefined,
      search: searchParams.get('search') || undefined,
    };

    const templates = await getTemplates(filter);

    return NextResponse.json(successResponse(templates));
  },
});

/**
 * POST /api/admin/templates
 * Create a new template
 */
export const POST = secureRoute.mutation({
  feature: Feature.MANAGE_TEMPLATES,
  schema: CreateTemplateSchema,
  handler: async (request, { user, data }) => {
    const hasAdminAccess = await isSystemAdmin(user.id);
    if (!hasAdminAccess) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const template = await createTemplate({
      ...data,
      createdBy: user.id,
    });

    return NextResponse.json(successResponse(template), { status: 201 });
  },
});
