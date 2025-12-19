import { NextResponse } from 'next/server';
import { z } from 'zod';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { CreateTemplateSchema } from '@/lib/validation/schemas';
import {
  getTemplates,
  createTemplate,
  type TemplateFilter,
} from '@/lib/services/templates/templateService';

// Validation schema for query parameters
const TemplateQueryParamsSchema = z.object({
  type: z.enum(['ENGAGEMENT_LETTER', 'PROPOSAL', 'AGREEMENT']).optional(),
  serviceLine: z.string().max(50).optional(),
  projectType: z.string().max(50).optional(),
  active: z.enum(['true', 'false']).optional(),
  search: z.string().max(100).optional(),
}).strict();

/**
 * GET /api/admin/templates
 * List all templates with optional filtering
 */
export const GET = secureRoute.query({
  feature: Feature.MANAGE_TEMPLATES,
  handler: async (request, { user }) => {
    // Feature permission check is handled by secureRoute

    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const queryResult = TemplateQueryParamsSchema.safeParse({
      type: searchParams.get('type') || undefined,
      serviceLine: searchParams.get('serviceLine') || undefined,
      projectType: searchParams.get('projectType') || undefined,
      active: searchParams.get('active') || undefined,
      search: searchParams.get('search') || undefined,
    });

    // Build filter from validated params (invalid params are ignored)
    const validParams = queryResult.success ? queryResult.data : {};
    const filter: TemplateFilter = {
      type: validParams.type,
      serviceLine: validParams.serviceLine,
      projectType: validParams.projectType,
      active: validParams.active ? validParams.active === 'true' : undefined,
      search: validParams.search,
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
    // Feature permission check is handled by secureRoute

    const template = await createTemplate({
      name: data.name,
      description: data.description,
      type: data.type,
      serviceLine: data.serviceLine,
      projectType: data.projectType,
      content: data.content,
      active: data.active,
      createdBy: user.id,
    });

    return NextResponse.json(successResponse(template), { status: 201 });
  },
});
