/**
 * Single News Bulletin API Routes
 * GET /api/news/[id] - Get single bulletin
 * PUT /api/news/[id] - Update bulletin (admin)
 * DELETE /api/news/[id] - Soft delete bulletin (admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { UpdateNewsBulletinSchema } from '@/lib/validation/schemas';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const bulletinId = Number.parseInt(id, 10);

    if (Number.isNaN(bulletinId)) {
      return NextResponse.json({ error: 'Invalid bulletin ID' }, { status: 400 });
    }

    // 2. Get the bulletin
    const bulletin = await prisma.newsBulletin.findUnique({
      where: { id: bulletinId },
      select: {
        id: true,
        title: true,
        summary: true,
        body: true,
        category: true,
        serviceLine: true,
        effectiveDate: true,
        expiresAt: true,
        contactPerson: true,
        actionRequired: true,
        callToActionUrl: true,
        callToActionText: true,
        isPinned: true,
        isActive: true,
        documentFileName: true,
        documentFilePath: true,
        documentFileSize: true,
        documentUploadedAt: true,
        showDocumentLink: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!bulletin) {
      return NextResponse.json({ error: 'Bulletin not found' }, { status: 404 });
    }

    return NextResponse.json(successResponse(bulletin));
  } catch (error) {
    return handleApiError(error, 'GET /api/news/[id]');
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check feature permission
    const hasPermission = await checkFeature(user.id, Feature.MANAGE_NEWS, 'BUSINESS_DEV');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to update news bulletins' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const bulletinId = Number.parseInt(id, 10);

    if (Number.isNaN(bulletinId)) {
      return NextResponse.json({ error: 'Invalid bulletin ID' }, { status: 400 });
    }

    // 3. Check bulletin exists
    const existing = await prisma.newsBulletin.findUnique({
      where: { id: bulletinId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Bulletin not found' }, { status: 404 });
    }

    // 4. Parse and validate request body
    const body = await request.json();
    const validated = UpdateNewsBulletinSchema.parse(body);

    // 5. Update the bulletin
    const bulletin = await prisma.newsBulletin.update({
      where: { id: bulletinId },
      data: {
        ...(validated.title !== undefined && { title: validated.title }),
        ...(validated.summary !== undefined && { summary: validated.summary }),
        ...(validated.body !== undefined && { body: validated.body }),
        ...(validated.category !== undefined && { category: validated.category }),
        ...(validated.serviceLine !== undefined && { serviceLine: validated.serviceLine }),
        ...(validated.effectiveDate !== undefined && { effectiveDate: validated.effectiveDate }),
        ...(validated.expiresAt !== undefined && { expiresAt: validated.expiresAt }),
        ...(validated.contactPerson !== undefined && { contactPerson: validated.contactPerson }),
        ...(validated.actionRequired !== undefined && { actionRequired: validated.actionRequired }),
        ...(validated.callToActionUrl !== undefined && { callToActionUrl: validated.callToActionUrl }),
        ...(validated.callToActionText !== undefined && { callToActionText: validated.callToActionText }),
        ...(validated.isPinned !== undefined && { isPinned: validated.isPinned }),
        ...(validated.isActive !== undefined && { isActive: validated.isActive }),
        ...(validated.documentFileName !== undefined && { documentFileName: validated.documentFileName }),
        ...(validated.documentFilePath !== undefined && { documentFilePath: validated.documentFilePath }),
        ...(validated.documentFileSize !== undefined && { documentFileSize: validated.documentFileSize }),
        ...(validated.documentUploadedAt !== undefined && { documentUploadedAt: validated.documentUploadedAt }),
        ...(validated.showDocumentLink !== undefined && { showDocumentLink: validated.showDocumentLink }),
      },
      select: {
        id: true,
        title: true,
        summary: true,
        body: true,
        category: true,
        serviceLine: true,
        effectiveDate: true,
        expiresAt: true,
        contactPerson: true,
        actionRequired: true,
        callToActionUrl: true,
        callToActionText: true,
        isPinned: true,
        isActive: true,
        documentFileName: true,
        documentFilePath: true,
        documentFileSize: true,
        documentUploadedAt: true,
        showDocumentLink: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(successResponse(bulletin));
  } catch (error) {
    return handleApiError(error, 'PUT /api/news/[id]');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check feature permission
    const hasPermission = await checkFeature(user.id, Feature.MANAGE_NEWS, 'BUSINESS_DEV');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to delete news bulletins' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const bulletinId = Number.parseInt(id, 10);

    if (Number.isNaN(bulletinId)) {
      return NextResponse.json({ error: 'Invalid bulletin ID' }, { status: 400 });
    }

    // 3. Check bulletin exists
    const existing = await prisma.newsBulletin.findUnique({
      where: { id: bulletinId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Bulletin not found' }, { status: 404 });
    }

    // 4. Soft delete by setting isActive to false
    await prisma.newsBulletin.update({
      where: { id: bulletinId },
      data: { isActive: false },
    });

    return NextResponse.json(successResponse({ message: 'Bulletin deleted successfully' }));
  } catch (error) {
    return handleApiError(error, 'DELETE /api/news/[id]');
  }
}
