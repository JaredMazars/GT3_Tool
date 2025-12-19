import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSystemAdmin } from '@/lib/services/auth/authorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { copyTemplate } from '@/lib/services/templates/templateService';

/**
 * POST /api/admin/templates/[id]/copy
 * Copy an existing template with all its sections
 */
export const POST = secureRoute.mutationWithParams<z.ZodAny, { id: string }>({
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

    const copiedTemplate = await copyTemplate(templateId, user.id);

    return NextResponse.json(successResponse(copiedTemplate), { status: 201 });
  },
});
