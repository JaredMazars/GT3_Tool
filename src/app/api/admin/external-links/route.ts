/**
 * External Links API Routes
 * GET /api/admin/external-links - List all links (activeOnly param for public access)
 * POST /api/admin/external-links - Create new link (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { CreateExternalLinkSchema } from '@/lib/validation/schemas';

/**
 * GET /api/admin/external-links
 * List external links - public for activeOnly, admin for all
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    // If fetching active links only, return public links
    if (activeOnly) {
      const links = await prisma.externalLink.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          url: true,
          icon: true,
          sortOrder: true,
        },
      });

      return NextResponse.json(successResponse(links));
    }

    // For all links (including inactive), fetch all
    const links = await prisma.externalLink.findMany({
      orderBy: { name: 'asc' },
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

    return NextResponse.json(successResponse(links));
  },
});

/**
 * POST /api/admin/external-links
 * Create new external link (admin only)
 */
export const POST = secureRoute.mutation({
  feature: Feature.MANAGE_EXTERNAL_LINKS,
  schema: CreateExternalLinkSchema,
  handler: async (request, { user, data }) => {
    const link = await prisma.externalLink.create({
      data: {
        name: data.name,
        url: data.url,
        icon: data.icon,
        active: data.active ?? true,
        sortOrder: data.sortOrder ?? 0,
        updatedAt: new Date(),
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

    return NextResponse.json(successResponse(link), { status: 201 });
  },
});
