import { NextResponse } from 'next/server';
import { z } from 'zod';
import { successResponse, parseNumericId } from '@/lib/utils/apiUtils';
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
  handler: async (request, { params }) => {
    const templateId = parseNumericId(params.id, 'Template');

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
  handler: async (request, { data, params }) => {
    const templateId = parseNumericId(params.id, 'Template');

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
  handler: async (request, { params }) => {
    const templateId = parseNumericId(params.id, 'Template');

    await deleteTemplate(templateId);

    return NextResponse.json(successResponse({ deleted: true }));
  },
});
