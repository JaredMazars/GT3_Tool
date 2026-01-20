/**
 * Template Version Actions API
 * GET /api/admin/templates/[id]/versions/[versionId] - Get specific version
 * PUT /api/admin/templates/[id]/versions/[versionId] - Activate or restore version
 */

import { NextRequest, NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { VersionActionSchema } from '@/lib/validation/schemas';
import { successResponse } from '@/lib/utils/apiUtils';
import {
  getVersion,
  activateVersion,
  restoreVersion,
} from '@/lib/services/templates/templateVersionService';

/**
 * GET /api/admin/templates/[id]/versions/[versionId]
 * Get specific version with sections
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.MANAGE_TEMPLATES,
  handler: async (request: NextRequest, { params }) => {
    const versionId = parseInt(params.versionId);

    if (isNaN(versionId)) {
      return NextResponse.json(
        { error: 'Invalid version ID' },
        { status: 400 }
      );
    }

    const version = await getVersion(versionId);

    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(successResponse(version));
  },
});

/**
 * PUT /api/admin/templates/[id]/versions/[versionId]
 * Activate or restore a version
 */
export const PUT = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TEMPLATES,
  schema: VersionActionSchema,
  handler: async (request: NextRequest, { user, params, data }) => {
    const versionId = parseInt(params.versionId);

    if (isNaN(versionId)) {
      return NextResponse.json(
        { error: 'Invalid version ID' },
        { status: 400 }
      );
    }

    if (data.action === 'activate') {
      await activateVersion(versionId);
    } else if (data.action === 'restore') {
      await restoreVersion(versionId, user.id);
    }

    return NextResponse.json(successResponse({ success: true }));
  },
});
