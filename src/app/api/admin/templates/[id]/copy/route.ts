import { NextResponse } from 'next/server';
import { z } from 'zod';
import { successResponse, parseNumericId } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { copyTemplate } from '@/lib/services/templates/templateService';

/**
 * POST /api/admin/templates/[id]/copy
 * Copy an existing template with all its sections
 */
export const POST = secureRoute.mutationWithParams<z.ZodAny, { id: string }>({
  feature: Feature.MANAGE_TEMPLATES,
  handler: async (request, { user, params }) => {
    const templateId = parseNumericId(params.id, 'Template');

    const copiedTemplate = await copyTemplate(templateId, user.id);

    return NextResponse.json(successResponse(copiedTemplate), { status: 201 });
  },
});
