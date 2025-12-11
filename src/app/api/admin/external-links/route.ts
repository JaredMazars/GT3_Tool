/**
 * External Links API Routes
 * GET /api/admin/external-links - List all links (activeOnly param for public access)
 * POST /api/admin/external-links - Create new link (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { CreateExternalLinkSchema } from '@/lib/validation/schemas';
import { sanitizeObject } from '@/lib/utils/sanitization';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    // If fetching active links only, no auth required (public to all logged-in users)
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

    // For all links (including inactive), require authentication and admin access
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check feature permission
    const hasAccess = await checkFeature(user.id, Feature.MANAGE_EXTERNAL_LINKS);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to manage external links' },
        { status: 403 }
      );
    }

    // Fetch all links
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
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/external-links');
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check feature permission
    const hasAccess = await checkFeature(user.id, Feature.MANAGE_EXTERNAL_LINKS);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to manage external links' },
        { status: 403 }
      );
    }

    // 3. Parse and validate input
    const body = await request.json();
    const sanitized = sanitizeObject(body);
    const validated = CreateExternalLinkSchema.parse(sanitized);

    // 4. Create link
    const link = await prisma.externalLink.create({
      data: {
        name: validated.name,
        url: validated.url,
        icon: validated.icon,
        active: validated.active ?? true,
        sortOrder: validated.sortOrder ?? 0,
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
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/external-links');
  }
}






