/**
 * Service Line Master API Routes
 * GET /api/admin/service-line-master - List all service line masters
 * POST /api/admin/service-line-master - Create new service line master
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature, RateLimitPresets } from '@/lib/api/secureRoute';
import { CreateServiceLineMasterSchema } from '@/lib/validation/schemas';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * GET /api/admin/service-line-master
 * List all service line masters
 */
export const GET = secureRoute.query({
  feature: Feature.MANAGE_SERVICE_LINES,
  handler: async (request, { user }) => {
    const serviceLineMasters = await prisma.serviceLineMaster.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        code: true,
        name: true,
        description: true,
        active: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
      // Bounded by actual service lines in system
      take: 100,
    });

    return NextResponse.json(successResponse(serviceLineMasters));
  },
});

/**
 * POST /api/admin/service-line-master
 * Create new service line master
 */
export const POST = secureRoute.mutation({
  feature: Feature.MANAGE_SERVICE_LINES,
  rateLimit: { ...RateLimitPresets.STANDARD, maxRequests: 20 },
  schema: CreateServiceLineMasterSchema,
  handler: async (request, { user, data }) => {
    // Check for unique code
    const existingCode = await prisma.serviceLineMaster.findUnique({
      where: { code: data.code },
      select: { code: true },
    });

    if (existingCode) {
      throw new AppError(
        409,
        `Service line with code '${data.code}' already exists`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Check for unique name
    const existingName = await prisma.serviceLineMaster.findFirst({
      where: { name: data.name },
      select: { code: true, name: true },
    });

    if (existingName) {
      throw new AppError(
        409,
        `Service line with name '${data.name}' already exists`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Get the next sortOrder value
    const maxSortOrder = await prisma.serviceLineMaster.aggregate({
      _max: { sortOrder: true },
    });
    const nextSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

    // Create service line master
    const serviceLineMaster = await prisma.serviceLineMaster.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        active: data.active ?? true,
        sortOrder: data.sortOrder ?? nextSortOrder,
        updatedAt: new Date(),
      },
      select: {
        code: true,
        name: true,
        description: true,
        active: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(successResponse(serviceLineMaster), { status: 201 });
  },
});
