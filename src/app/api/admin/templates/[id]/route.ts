import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSystemAdmin } from '@/lib/services/auth/authorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { UpdateTemplateSchema } from '@/lib/validation/schemas';
import {
  getTemplateById,
  updateTemplate,
  deleteTemplate,
} from '@/lib/services/templates/templateService';

/**
 * GET /api/admin/templates/[id]
 * Get a single template by ID
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

    const template = await getTemplateById(templateId);

    if (!template) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json(successResponse(template));
  },
});

/**
 * PUT /api/admin/templates/[id]
 * Update a template
 */
export const PUT = secureRoute.mutationWithParams<typeof UpdateTemplateSchema, { id: string }>({
  feature: Feature.MANAGE_TEMPLATES,
  schema: UpdateTemplateSchema,
  handler: async (request, { user, data, params }) => {
    const hasAdminAccess = await isSystemAdmin(user.id);
    if (!hasAdminAccess) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const templateId = Number.parseInt(params.id, 10);
    if (Number.isNaN(templateId)) {
      return NextResponse.json({ success: false, error: 'Invalid template ID' }, { status: 400 });
    }

    const template = await updateTemplate(templateId, data);

    return NextResponse.json(successResponse(template));
  },
});

/**
 * DELETE /api/admin/templates/[id]
 * Delete a template
 */
export const DELETE = secureRoute.mutationWithParams<z.ZodAny, { id: string }>({
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

    await deleteTemplate(templateId);

    return NextResponse.json(successResponse({ deleted: true }));
  },
});
