/**
 * External Link Management API Routes
 * PATCH /api/admin/external-links/[id] - Update link
 * DELETE /api/admin/external-links/[id] - Delete link
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { UpdateExternalLinkSchema } from '@/lib/validation/schemas';
import { sanitizeObject } from '@/lib/utils/sanitization';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse ID
    const linkId = Number.parseInt(params.id);
    if (Number.isNaN(linkId)) {
      return NextResponse.json({ error: 'Invalid link ID' }, { status: 400 });
    }

    // 3. Check feature permission
    const hasAccess = await checkFeature(user.id, Feature.MANAGE_EXTERNAL_LINKS);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to manage external links' },
        { status: 403 }
      );
    }

    // 4. Parse and validate input
    const body = await request.json();
    const sanitized = sanitizeObject(body);
    const validated = UpdateExternalLinkSchema.parse(sanitized);

    // 5. Check if link exists
    const existingLink = await prisma.externalLink.findUnique({
      where: { id: linkId },
      select: { id: true },
    });

    if (!existingLink) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    // 6. Update link
    const link = await prisma.externalLink.update({
      where: { id: linkId },
      data: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.url !== undefined && { url: validated.url }),
        ...(validated.icon !== undefined && { icon: validated.icon }),
        ...(validated.active !== undefined && { active: validated.active }),
        ...(validated.sortOrder !== undefined && { sortOrder: validated.sortOrder }),
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
  } catch (error) {
    return handleApiError(error, 'PATCH /api/admin/external-links/[id]');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse ID
    const linkId = Number.parseInt(params.id);
    if (Number.isNaN(linkId)) {
      return NextResponse.json({ error: 'Invalid link ID' }, { status: 400 });
    }

    // 3. Check feature permission
    const hasAccess = await checkFeature(user.id, Feature.MANAGE_EXTERNAL_LINKS);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to manage external links' },
        { status: 403 }
      );
    }

    // 4. Check if link exists
    const existingLink = await prisma.externalLink.findUnique({
      where: { id: linkId },
      select: { id: true, name: true },
    });

    if (!existingLink) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    // 5. Delete link
    await prisma.externalLink.delete({
      where: { id: linkId },
    });

    return NextResponse.json(
      successResponse({ message: 'Link deleted successfully', name: existingLink.name })
    );
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/external-links/[id]');
  }
}






