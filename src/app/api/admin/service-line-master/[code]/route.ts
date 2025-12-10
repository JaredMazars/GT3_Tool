/**
 * Service Line Master Detail API Routes
 * GET /api/admin/service-line-master/[code] - Get service line master by code
 * PUT /api/admin/service-line-master/[code] - Update service line master
 * DELETE /api/admin/service-line-master/[code] - Delete service line master
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { UpdateServiceLineMasterSchema } from '@/lib/validation/schemas';
import { sanitizeObject } from '@/lib/utils/sanitization';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
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

    // 3. Get code from params
    const code = params.code;

    // 4. Fetch service line master
    const serviceLineMaster = await prisma.serviceLineMaster.findUnique({
      where: { code },
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

    if (!serviceLineMaster) {
      throw new AppError(
        404,
        `Service line master with code '${code}' not found`,
        ErrorCodes.NOT_FOUND
      );
    }

    return NextResponse.json(successResponse(serviceLineMaster));
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/service-line-master/[code]');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
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

    // 3. Get code from params
    const code = params.code;

    // 4. Check if exists
    const existing = await prisma.serviceLineMaster.findUnique({
      where: { code },
      select: { code: true, name: true },
    });

    if (!existing) {
      throw new AppError(
        404,
        `Service line master with code '${code}' not found`,
        ErrorCodes.NOT_FOUND
      );
    }

    // 5. Parse and validate input
    const body = await request.json();
    const sanitized = sanitizeObject(body);
    const validated = UpdateServiceLineMasterSchema.parse(sanitized);

    // 6. Check for unique name if name is being changed (case-insensitive comparison)
    if (validated.name && validated.name !== existing.name) {
      const nameExists = await prisma.serviceLineMaster.findFirst({
        where: {
          name: validated.name,
          code: {
            not: code,
          },
        },
        select: { code: true, name: true },
      });

      if (nameExists) {
        throw new AppError(
          409,
          `Service line with name '${validated.name}' already exists`,
          ErrorCodes.VALIDATION_ERROR
        );
      }
    }

    // 7. Update service line master
    const updated = await prisma.serviceLineMaster.update({
      where: { code },
      data: {
        name: validated.name,
        description: validated.description,
        active: validated.active,
        sortOrder: validated.sortOrder,
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

    return NextResponse.json(successResponse(updated));
  } catch (error) {
    return handleApiError(error, 'PUT /api/admin/service-line-master/[code]');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
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

    // 3. Get code from params
    const code = params.code;

    // 4. Check if exists
    const existing = await prisma.serviceLineMaster.findUnique({
      where: { code },
      select: { code: true, name: true },
    });

    if (!existing) {
      throw new AppError(
        404,
        `Service line master with code '${code}' not found`,
        ErrorCodes.NOT_FOUND
      );
    }

    // 5. Check for relationships with ServiceLineExternal
    const externalReferences = await prisma.serviceLineExternal.count({
      where: { masterCode: code },
    });

    if (externalReferences > 0) {
      throw new AppError(
        409,
        `Cannot delete service line '${existing.name}'. It is referenced by ${externalReferences} external service line(s). Please remove these mappings first.`,
        ErrorCodes.VALIDATION_ERROR,
        { externalReferences }
      );
    }

    // 6. Delete service line master
    await prisma.serviceLineMaster.delete({
      where: { code },
    });

    return NextResponse.json(
      successResponse({ message: 'Service line master deleted successfully' })
    );
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/service-line-master/[code]');
  }
}
