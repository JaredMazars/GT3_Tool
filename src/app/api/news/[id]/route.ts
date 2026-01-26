/**
 * Single News Bulletin API Routes
 * GET /api/news/[id] - Get single bulletin
 * PUT /api/news/[id] - Update bulletin (admin)
 * DELETE /api/news/[id] - Soft delete bulletin (admin)
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute } from '@/lib/api/secureRoute';
import { UpdateNewsBulletinSchema } from '@/lib/validation/schemas';

const bulletinSelect = {
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
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

/**
 * GET /api/news/[id]
 * Get single bulletin
 */
export const GET = secureRoute.queryWithParams<{ id: string }>({
  handler: async (request, { user, params }) => {
    const bulletinId = Number.parseInt(params.id, 10);

    if (Number.isNaN(bulletinId)) {
      return NextResponse.json({ success: false, error: 'Invalid bulletin ID' }, { status: 400 });
    }

    const bulletin = await prisma.newsBulletin.findUnique({
      where: { id: bulletinId },
      select: bulletinSelect,
    });

    if (!bulletin) {
      return NextResponse.json({ success: false, error: 'Bulletin not found' }, { status: 404 });
    }

    return NextResponse.json(successResponse(bulletin));
  },
});

/**
 * PUT /api/news/[id]
 * Update bulletin (admin)
 */
export const PUT = secureRoute.mutationWithParams<typeof UpdateNewsBulletinSchema, { id: string }>({
  schema: UpdateNewsBulletinSchema,
  handler: async (request, { user, params, data }) => {
    const hasPermission = await checkFeature(user.id, Feature.MANAGE_NEWS, 'BUSINESS_DEV');
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to update news bulletins' },
        { status: 403 }
      );
    }

    const bulletinId = Number.parseInt(params.id, 10);

    if (Number.isNaN(bulletinId)) {
      return NextResponse.json({ success: false, error: 'Invalid bulletin ID' }, { status: 400 });
    }

    const existing = await prisma.newsBulletin.findUnique({
      where: { id: bulletinId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Bulletin not found' }, { status: 404 });
    }

    const bulletin = await prisma.newsBulletin.update({
      where: { id: bulletinId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.summary !== undefined && { summary: data.summary }),
        ...(data.body !== undefined && { body: data.body }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.serviceLine !== undefined && { serviceLine: data.serviceLine }),
        ...(data.effectiveDate !== undefined && { effectiveDate: data.effectiveDate }),
        ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt }),
        ...(data.contactPerson !== undefined && { contactPerson: data.contactPerson }),
        ...(data.actionRequired !== undefined && { actionRequired: data.actionRequired }),
        ...(data.callToActionUrl !== undefined && { callToActionUrl: data.callToActionUrl }),
        ...(data.callToActionText !== undefined && { callToActionText: data.callToActionText }),
        ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.documentFileName !== undefined && { documentFileName: data.documentFileName }),
        ...(data.documentFilePath !== undefined && { documentFilePath: data.documentFilePath }),
        ...(data.documentFileSize !== undefined && { documentFileSize: data.documentFileSize }),
        ...(data.documentUploadedAt !== undefined && { documentUploadedAt: data.documentUploadedAt }),
        ...(data.showDocumentLink !== undefined && { showDocumentLink: data.showDocumentLink }),
      },
      select: bulletinSelect,
    });

    return NextResponse.json(successResponse(bulletin));
  },
});

/**
 * DELETE /api/news/[id]
 * Soft delete bulletin (admin)
 */
export const DELETE = secureRoute.mutationWithParams<z.ZodAny, { id: string }>({
  handler: async (request, { user, params }) => {
    const hasPermission = await checkFeature(user.id, Feature.MANAGE_NEWS, 'BUSINESS_DEV');
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to delete news bulletins' },
        { status: 403 }
      );
    }

    const bulletinId = Number.parseInt(params.id, 10);

    if (Number.isNaN(bulletinId)) {
      return NextResponse.json({ success: false, error: 'Invalid bulletin ID' }, { status: 400 });
    }

    const existing = await prisma.newsBulletin.findUnique({
      where: { id: bulletinId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Bulletin not found' }, { status: 404 });
    }

    await prisma.newsBulletin.update({
      where: { id: bulletinId },
      data: { isActive: false },
    });

    return NextResponse.json(successResponse({ message: 'Bulletin deleted successfully' }));
  },
});
