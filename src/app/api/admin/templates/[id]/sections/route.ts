import { NextResponse } from 'next/server';
import { successResponse, parseNumericId } from '@/lib/utils/apiUtils';
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
  handler: async (request, { params }) => {
    const templateId = parseNumericId(params.id, 'Template');

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
  handler: async (request, { data, params }) => {
    const templateId = parseNumericId(params.id, 'Template');

    const section = await createTemplateSection({
      templateId,
      sectionKey: data.sectionKey,
      title: data.title,
      content: data.content,
      isRequired: data.isRequired,
      isAiAdaptable: data.isAiAdaptable,
      order: data.order,
      applicableServiceLines: data.applicableServiceLines,
      applicableProjectTypes: data.applicableProjectTypes,
    });

    return NextResponse.json(successResponse(section), { status: 201 });
  },
});
