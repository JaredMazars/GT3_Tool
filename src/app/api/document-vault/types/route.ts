export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';

/**
 * GET /api/document-vault/types
 * Get active document types (for dropdowns in forms)
 * Available to all authenticated users
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_DOCUMENT_VAULT,
  handler: async (request, { user }) => {
    const types = await prisma.vaultDocumentType.findMany({
      where: { active: true },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        icon: true,
        color: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(successResponse(types));
  },
});
