import { NextResponse } from 'next/server';
import { z } from 'zod';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { 
  CreateTemplateWithSectionsSchema,
} from '@/lib/validation/schemas';
import {
  getTemplates,
  createTemplate,
  type TemplateFilter,
} from '@/lib/services/templates/templateService';
import { prisma } from '@/lib/db/prisma';
import { 
  moveTemplateFromTemp,
  deleteTemplateTemp,
} from '@/lib/services/documents/blobStorage';
import { logger } from '@/lib/utils/logger';

// Validation schema for query parameters
const TemplateQueryParamsSchema = z.object({
  type: z.enum(['ENGAGEMENT_LETTER', 'PROPOSAL', 'AGREEMENT']).optional(),
  serviceLine: z.string().max(50).optional(),
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
      active: searchParams.get('active') || undefined,
      search: searchParams.get('search') || undefined,
    });

    // Build filter from validated params (invalid params are ignored)
    const validParams = queryResult.success ? queryResult.data : {};
    const filter: TemplateFilter = {
      type: validParams.type,
      serviceLine: validParams.serviceLine,
      active: validParams.active ? validParams.active === 'true' : undefined,
      search: validParams.search,
    };

    const templates = await getTemplates(filter);

    return NextResponse.json(successResponse(templates));
  },
});

/**
 * POST /api/admin/templates
 * Create a new template with sections
 */
export const POST = secureRoute.mutation({
  feature: Feature.MANAGE_TEMPLATES,
  schema: CreateTemplateWithSectionsSchema,
  handler: async (request, { user, data }) => {
    // Feature permission check is handled by secureRoute

    // Create template with sections using transaction
    const template = await prisma.$transaction(async (tx) => {
        // 1. Create template
        const newTemplate = await tx.template.create({
          data: {
            name: data.name,
            description: data.description,
            type: data.type,
            serviceLine: data.serviceLine,
            active: data.active ?? true,
            createdBy: user.id,
            updatedAt: new Date(),
          },
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            serviceLine: true,
            active: true,
            createdBy: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        // 2. Create sections in bulk
        await tx.templateSection.createMany({
          data: data.sections.map((section) => ({
            templateId: newTemplate.id,
            sectionKey: section.sectionKey,
            title: section.title,
            content: section.content,
            isRequired: section.isRequired ?? true,
            isAiAdaptable: section.isAiAdaptable ?? false,
            order: section.order,
            applicableServiceLines: section.applicableServiceLines
              ? JSON.stringify(section.applicableServiceLines)
              : null,
            applicableProjectTypes: section.applicableProjectTypes
              ? JSON.stringify(section.applicableProjectTypes)
              : null,
            updatedAt: new Date(),
          })),
        });

        // 3. Fetch complete template with sections
        const completeTemplate = await tx.template.findUnique({
          where: { id: newTemplate.id },
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            serviceLine: true,
            active: true,
            createdBy: true,
            createdAt: true,
            updatedAt: true,
            TemplateSection: {
              select: {
                id: true,
                sectionKey: true,
                title: true,
                content: true,
                isRequired: true,
                isAiAdaptable: true,
                order: true,
                applicableServiceLines: true,
                applicableProjectTypes: true,
              },
              orderBy: { order: 'asc' },
            },
          },
        });

        return completeTemplate;
      });

    if (!template) {
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      );
    }

    // Move temp blob to permanent storage if applicable
    if ('tempBlobPath' in data && data.tempBlobPath) {
      try {
        await moveTemplateFromTemp(data.tempBlobPath, template.id);
      } catch (error) {
        logger.error('Failed to move template from temp storage', { 
          templateId: template.id,
          tempBlobPath: data.tempBlobPath,
          error,
        });
        // Don't fail the request - template is already created
      }
    }

    logger.info('Created template with sections', {
      templateId: template.id,
      sectionCount: data.sections.length,
    });

    return NextResponse.json(successResponse(template), { status: 201 });
  },
});
