/**
 * News Bulletins API Routes
 * GET /api/news - List bulletins (all authenticated users)
 * POST /api/news - Create bulletin (BUSINESS_DEV ADMINISTRATOR only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import {
  CreateNewsBulletinSchema,
  NewsBulletinFiltersSchema,
} from '@/lib/validation/schemas';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
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

    // Build where clause
    const where: Prisma.NewsBulletinWhereInput = {
      isActive: filters.isActive ?? true,
    };

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.serviceLine) {
      // Filter by specific service line OR bulletins for all (null serviceLine)
      where.OR = [
        { serviceLine: filters.serviceLine },
        { serviceLine: null },
      ];
    }

    if (filters.isPinned !== undefined) {
      where.isPinned = filters.isPinned;
    }

    if (!filters.includeExpired) {
      where.OR = [
        ...(where.OR || []),
        { expiresAt: null },
        { expiresAt: { gte: new Date() } },
      ];
      // If we already have an OR for serviceLine, we need to handle this differently
      if (filters.serviceLine) {
        where.AND = [
          {
            OR: [
              { serviceLine: filters.serviceLine },
              { serviceLine: null },
            ],
          },
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: new Date() } },
            ],
          },
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

    // Get total count
    const total = await prisma.newsBulletin.count({ where });

    // Get bulletins with pagination
    const bulletins = await prisma.newsBulletin.findMany({
      where,
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
      orderBy: [
        { isPinned: 'desc' },
        { effectiveDate: 'desc' },
      ],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    });

    return NextResponse.json(
      successResponse({
        bulletins,
        total,
        page: filters.page,
        pageSize: filters.pageSize,
        totalPages: Math.ceil(total / filters.pageSize),
      })
    );
  } catch (error) {
    return handleApiError(error, 'GET /api/news');
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check feature permission - must have MANAGE_NEWS for BUSINESS_DEV
    const hasPermission = await checkFeature(user.id, Feature.MANAGE_NEWS, 'BUSINESS_DEV');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to create news bulletins' },
        { status: 403 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const validated = CreateNewsBulletinSchema.parse(body);

    // 4. Create the bulletin
    const bulletin = await prisma.newsBulletin.create({
      data: {
        title: validated.title,
        summary: validated.summary,
        body: validated.body,
        category: validated.category,
        serviceLine: validated.serviceLine ?? null,
        effectiveDate: validated.effectiveDate,
        expiresAt: validated.expiresAt ?? null,
        contactPerson: validated.contactPerson ?? null,
        actionRequired: validated.actionRequired,
        callToActionUrl: validated.callToActionUrl ?? null,
        callToActionText: validated.callToActionText ?? null,
        isPinned: validated.isPinned,
        documentFileName: validated.documentFileName ?? null,
        documentFilePath: validated.documentFilePath ?? null,
        documentFileSize: validated.documentFileSize ?? null,
        documentUploadedAt: validated.documentUploadedAt ?? null,
        showDocumentLink: validated.showDocumentLink ?? false,
        createdById: user.id,
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

    return NextResponse.json(successResponse(bulletin), { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/news');
  }
}
