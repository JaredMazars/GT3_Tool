/**
 * Service Line Master Detail API Routes
 * GET /api/admin/service-line-master/[code] - Get service line master by code
 * PUT /api/admin/service-line-master/[code] - Update service line master
 * DELETE /api/admin/service-line-master/[code] - Delete service line master
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { UpdateServiceLineMasterSchema, safeIdentifier } from '@/lib/validation/schemas';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { invalidateServiceLineCache } from '@/lib/services/cache/cacheInvalidation';
import { auditAdminAction } from '@/lib/utils/auditLog';

// Validation schema for code route parameter
const CodeParamSchema = safeIdentifier(50);

/**
 * GET /api/admin/service-line-master/[code]
 * Get service line master by code
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.MANAGE_SERVICE_LINES,
  handler: async (request, { user, params }) => {
    // Validate code parameter
    const codeResult = CodeParamSchema.safeParse(params.code);
    if (!codeResult.success) {
      throw new AppError(400, 'Invalid code parameter', ErrorCodes.VALIDATION_ERROR);
    }
    const code = codeResult.data;

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
  },
});

/**
 * PUT /api/admin/service-line-master/[code]
 * Update service line master
 */
export const PUT = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_SERVICE_LINES,
  schema: UpdateServiceLineMasterSchema,
  handler: async (request, { user, data, params }) => {
    // Validate code parameter
    const codeResult = CodeParamSchema.safeParse(params.code);
    if (!codeResult.success) {
      throw new AppError(400, 'Invalid code parameter', ErrorCodes.VALIDATION_ERROR);
    }
    const code = codeResult.data;

    // Use transaction to prevent race conditions on unique name check + update
    const updated = await prisma.$transaction(async (tx) => {
      // Check if exists
      const existing = await tx.serviceLineMaster.findUnique({
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

      // Check for unique name if name is being changed
      if (data.name && data.name !== existing.name) {
        const nameExists = await tx.serviceLineMaster.findFirst({
          where: {
            name: data.name,
            code: { not: code },
          },
          select: { code: true },
        });

        if (nameExists) {
          throw new AppError(
            409,
            `Service line with name '${data.name}' already exists`,
            ErrorCodes.VALIDATION_ERROR
          );
        }
      }

      // Update service line master
      return tx.serviceLineMaster.update({
        where: { code },
        data: {
          name: data.name,
          description: data.description,
          active: data.active,
          sortOrder: data.sortOrder,
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
    });

    // Invalidate service line cache
    await invalidateServiceLineCache(code);

    // Audit log the admin action
    await auditAdminAction(
      user.id,
      'UPDATE_SERVICE_LINE_MASTER',
      'serviceLineMaster',
      code,
      { updatedFields: Object.keys(data) }
    );

    return NextResponse.json(successResponse(updated));
  },
});

/**
 * DELETE /api/admin/service-line-master/[code]
 * Delete service line master
 */
export const DELETE = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_SERVICE_LINES,
  handler: async (request, { user, params }) => {
    // Validate code parameter
    const codeResult = CodeParamSchema.safeParse(params.code);
    if (!codeResult.success) {
      throw new AppError(400, 'Invalid code parameter', ErrorCodes.VALIDATION_ERROR);
    }
    const code = codeResult.data;

    // Check if exists
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

    // Check for relationships with ServiceLineExternal
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

    // Delete service line master
    await prisma.serviceLineMaster.delete({
      where: { code },
    });

    // Invalidate service line cache
    await invalidateServiceLineCache(code);

    // Audit log the admin action
    await auditAdminAction(
      user.id,
      'DELETE_SERVICE_LINE_MASTER',
      'serviceLineMaster',
      code,
      { deletedName: existing.name }
    );

    return NextResponse.json(
      successResponse({ message: 'Service line master deleted successfully' })
    );
  },
});








