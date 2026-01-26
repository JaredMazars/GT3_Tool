/**
 * News Bulletins API Routes
 * GET /api/news - List bulletins (all authenticated users)
 * POST /api/news - Create bulletin (BUSINESS_DEV ADMINISTRATOR only)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute } from '@/lib/api/secureRoute';
import {
  CreateNewsBulletinSchema,
  NewsBulletinFiltersSchema,
} from '@/lib/validation/schemas';
import { Prisma } from '@prisma/client';

/**
 * GET /api/news
 * List news bulletins
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);

    const filters = NewsBulletinFiltersSchema.parse({
      category: searchParams.get('category') || undefined,
      serviceLine: searchParams.get('serviceLine') || undefined,
      isActive: searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined,
      isPinned: searchParams.get('isPinned') === 'true' ? true : undefined,
      includeExpired: searchParams.get('includeExpired') === 'true',
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') ? Number.parseInt(searchParams.get('page')!) : 1,
      pageSize: searchParams.get('pageSize') ? Number.parseInt(searchParams.get('pageSize')!) : 20,
    });

    const where: Prisma.NewsBulletinWhereInput = {
      isActive: filters.isActive ?? true,
    };

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.serviceLine) {
      where.OR = [{ serviceLine: filters.serviceLine }, { serviceLine: null }];
    }

    if (filters.isPinned !== undefined) {
      where.isPinned = filters.isPinned;
    }

    if (!filters.includeExpired) {
      where.OR = [...(where.OR || []), { expiresAt: null }, { expiresAt: { gte: new Date() } }];
      if (filters.serviceLine) {
        where.AND = [
          { OR: [{ serviceLine: filters.serviceLine }, { serviceLine: null }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
        ];
        delete where.OR;
      }
    }

    if (filters.search) {
      const searchCondition = {
        OR: [
          { title: { contains: filters.search } },
          { summary: { contains: filters.search } },
          { body: { contains: filters.search } },
        ],
      };
      if (where.AND) {
        (where.AND as Prisma.NewsBulletinWhereInput[]).push(searchCondition);
      } else {
        where.AND = [searchCondition];
      }
    }

    const total = await prisma.newsBulletin.count({ where });

    const bulletins = await prisma.newsBulletin.findMany({
      where,
      select: {
        id: true, title: true, summary: true, body: true, category: true,
        serviceLine: true, effectiveDate: true, expiresAt: true, contactPerson: true,
        actionRequired: true, callToActionUrl: true, callToActionText: true,
        isPinned: true, isActive: true, documentFileName: true, documentFilePath: true,
        documentFileSize: true, documentUploadedAt: true, showDocumentLink: true,
        createdAt: true, updatedAt: true,
        User: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { effectiveDate: 'desc' }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    });

    return NextResponse.json(
      successResponse({
        bulletins, total,
        page: filters.page,
        pageSize: filters.pageSize,
        totalPages: Math.ceil(total / filters.pageSize),
      })
    );
  },
});

/**
 * POST /api/news
 * Create news bulletin
 */
export const POST = secureRoute.mutation({
  schema: CreateNewsBulletinSchema,
  handler: async (request, { user, data }) => {
    const hasPermission = await checkFeature(user.id, Feature.MANAGE_NEWS, 'BUSINESS_DEV');
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to create news bulletins' },
        { status: 403 }
      );
    }

    const bulletin = await prisma.newsBulletin.create({
      data: {
        title: data.title,
        summary: data.summary,
        body: data.body,
        category: data.category,
        serviceLine: data.serviceLine ?? null,
        effectiveDate: data.effectiveDate,
        expiresAt: data.expiresAt ?? null,
        contactPerson: data.contactPerson ?? null,
        actionRequired: data.actionRequired,
        callToActionUrl: data.callToActionUrl ?? null,
        callToActionText: data.callToActionText ?? null,
        isPinned: data.isPinned,
        documentFileName: data.documentFileName ?? null,
        documentFilePath: data.documentFilePath ?? null,
        documentFileSize: data.documentFileSize ?? null,
        documentUploadedAt: data.documentUploadedAt ?? null,
        showDocumentLink: data.showDocumentLink ?? false,
        createdById: user.id,
        updatedAt: new Date(),
      },
      select: {
        id: true, title: true, summary: true, body: true, category: true,
        serviceLine: true, effectiveDate: true, expiresAt: true, contactPerson: true,
        actionRequired: true, callToActionUrl: true, callToActionText: true,
        isPinned: true, isActive: true, documentFileName: true, documentFilePath: true,
        documentFileSize: true, documentUploadedAt: true, showDocumentLink: true,
        createdAt: true, updatedAt: true,
        User: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(successResponse(bulletin), { status: 201 });
  },
});
