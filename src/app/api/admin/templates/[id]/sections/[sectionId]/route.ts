import { NextResponse } from 'next/server';
import { z } from 'zod';
import { successResponse, parseNumericId } from '@/lib/utils/apiUtils';
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
  handler: async (request, { data, params }) => {
    // Validate both params
    parseNumericId(params.id, 'Template');
    const sectionId = parseNumericId(params.sectionId, 'Section');

    const section = await updateTemplateSection(sectionId, data);

    return NextResponse.json(successResponse(section));
  },
});

/**
 * DELETE /api/admin/templates/[id]/sections/[sectionId]
 * Delete a template section
 */
export const DELETE = secureRoute.mutationWithParams<z.ZodAny, { id: string; sectionId: string }>({
  feature: Feature.MANAGE_TEMPLATES,
  handler: async (request, { params }) => {
    // Validate both params
    parseNumericId(params.id, 'Template');
    const sectionId = parseNumericId(params.sectionId, 'Section');

    await deleteTemplateSection(sectionId);

    return NextResponse.json(successResponse({ deleted: true }));
  },
});
