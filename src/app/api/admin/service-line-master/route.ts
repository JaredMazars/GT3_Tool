/**
 * Service Line Master API Routes
 * GET /api/admin/service-line-master - List all service line masters
 * POST /api/admin/service-line-master - Create new service line master
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { CreateServiceLineMasterSchema } from '@/lib/validation/schemas';
import { sanitizeObject } from '@/lib/utils/sanitization';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check feature permission
    const hasAccess = await checkFeature(user.id, Feature.MANAGE_SERVICE_LINES);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to manage service lines' },
        { status: 403 }
      );
    }

    // 3. Fetch all service line masters sorted by sortOrder
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
    });

    return NextResponse.json(successResponse(serviceLineMasters));
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/service-line-master');
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
    const hasAccess = await checkFeature(user.id, Feature.MANAGE_SERVICE_LINES);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to manage service lines' },
        { status: 403 }
      );
    }

    // 3. Parse and validate input
    const body = await request.json();
    const sanitized = sanitizeObject(body);
    const validated = CreateServiceLineMasterSchema.parse(sanitized);

    // 4. Check for unique code
    const existingCode = await prisma.serviceLineMaster.findUnique({
      where: { code: validated.code },
      select: { code: true },
    });

    if (existingCode) {
      throw new AppError(
        409,
        `Service line with code '${validated.code}' already exists`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // 5. Check for unique name (case-insensitive comparison)
    const existingName = await prisma.serviceLineMaster.findFirst({
      where: { 
        name: validated.name,
      },
      select: { code: true, name: true },
    });

    if (existingName) {
      throw new AppError(
        409,
        `Service line with name '${validated.name}' already exists`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // 6. Get the next sortOrder value
    const maxSortOrder = await prisma.serviceLineMaster.aggregate({
      _max: { sortOrder: true },
    });
    const nextSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

    // 7. Create service line master
    const serviceLineMaster = await prisma.serviceLineMaster.create({
      data: {
        code: validated.code,
        name: validated.name,
        description: validated.description ?? null,
        active: validated.active ?? true,
        sortOrder: validated.sortOrder ?? nextSortOrder,
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
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/service-line-master');
  }
}



