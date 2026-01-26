/**
 * Template Version Management API
 * GET /api/admin/templates/[id]/versions - Get version history
 * POST /api/admin/templates/[id]/versions - Create new version
 */

import { NextRequest, NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { CreateVersionSchema } from '@/lib/validation/schemas';
import { successResponse, parseNumericId } from '@/lib/utils/apiUtils';
import {
  getVersionHistory,
  createNewVersion,
} from '@/lib/services/templates/templateVersionService';

/**
 * GET /api/admin/templates/[id]/versions
 * Get version history for a template
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.MANAGE_TEMPLATES,
  handler: async (request: NextRequest, { params }) => {
    const templateId = parseNumericId(params.id, 'Template');

    const history = await getVersionHistory(templateId);

    return NextResponse.json(successResponse(history));
  },
});

/**
 * POST /api/admin/templates/[id]/versions
 * Create a new version from current template state
 */
export const POST = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TEMPLATES,
  schema: CreateVersionSchema,
  handler: async (request: NextRequest, { user, params, data }) => {
    const templateId = parseNumericId(params.id, 'Template');

    const version = await createNewVersion({
      templateId,
      changeNotes: data.changeNotes,
      createdBy: user.id,
    });

    return NextResponse.json(successResponse(version), { status: 201 });
  },
});
