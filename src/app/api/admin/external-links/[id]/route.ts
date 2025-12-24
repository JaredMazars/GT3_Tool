/**
 * External Link Management API Routes
 * PATCH /api/admin/external-links/[id] - Update link
 * DELETE /api/admin/external-links/[id] - Delete link
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { UpdateExternalLinkSchema } from '@/lib/validation/schemas';
import { z } from 'zod';

/**
 * PATCH /api/admin/external-links/[id]
 * Update an external link
 */
export const PATCH = secureRoute.mutationWithParams<typeof UpdateExternalLinkSchema, { id: string }>({
  feature: Feature.MANAGE_EXTERNAL_LINKS,
  schema: UpdateExternalLinkSchema,
  handler: async (request, { user, data, params }) => {
    const linkId = Number.parseInt(params.id, 10);
    if (Number.isNaN(linkId)) {
      return NextResponse.json({ success: false, error: 'Invalid link ID' }, { status: 400 });
    }

    // Check if link exists
    const existingLink = await prisma.externalLink.findUnique({
      where: { id: linkId },
      select: { id: true },
    });

    if (!existingLink) {
      return NextResponse.json({ success: false, error: 'Link not found' }, { status: 404 });
    }

    // Update link
    const link = await prisma.externalLink.update({
      where: { id: linkId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.url !== undefined && { url: data.url }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.active !== undefined && { active: data.active }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
      select: {
        id: true,
        name: true,
        url: true,
        icon: true,
        active: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(successResponse(link));
  },
});

/**
 * DELETE /api/admin/external-links/[id]
 * Delete an external link
 */
export const DELETE = secureRoute.mutationWithParams<z.ZodAny, { id: string }>({
  feature: Feature.MANAGE_EXTERNAL_LINKS,
  handler: async (request, { user, params }) => {
    const linkId = Number.parseInt(params.id, 10);
    if (Number.isNaN(linkId)) {
      return NextResponse.json({ success: false, error: 'Invalid link ID' }, { status: 400 });
    }

    // Check if link exists
    const existingLink = await prisma.externalLink.findUnique({
      where: { id: linkId },
      select: { id: true, name: true },
    });

    if (!existingLink) {
      return NextResponse.json({ success: false, error: 'Link not found' }, { status: 404 });
    }

    // Delete link
    await prisma.externalLink.delete({
      where: { id: linkId },
    });

    return NextResponse.json(
      successResponse({ message: 'Link deleted successfully', name: existingLink.name })
    );
  },
});








