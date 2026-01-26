import { NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { CreateChangeRequestSchema } from '@/lib/validation/schemas';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { hasServiceLineRole } from '@/lib/utils/roleHierarchy';
import { isSystemAdmin } from '@/lib/utils/systemAdmin';
import { invalidateClientCache } from '@/lib/services/cache/cacheInvalidation';
import { invalidateClientListCache } from '@/lib/services/cache/listCache';
import {
  createChangeRequest,
  getChangeRequests,
  type ChangeRequestStatus,
} from '@/lib/services/clients/changeRequestService';
import { getUserSubServiceLineGroups } from '@/lib/services/service-lines/serviceLineService';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

// Query params validation for GET
const ChangeRequestQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
}).strict();

/**
 * POST /api/clients/[id]/change-requests
 * Create a new change request for client partner or manager
 * 
 * Requirements:
 * - User must have MANAGER or higher role in at least one service line
 * - User must have access to the client via service line
 */
export const POST = secureRoute.mutationWithParams<typeof CreateChangeRequestSchema, { id: string }>({
  feature: Feature.MANAGE_CLIENTS,
  schema: CreateChangeRequestSchema,
  handler: async (request, { user, data, params }) => {
    const clientId = parseInt(params.id, 10);

    if (isNaN(clientId)) {
      throw new AppError(400, 'Invalid client ID', ErrorCodes.VALIDATION_ERROR);
    }

    // Check if user has MANAGER or higher role in any service line (unless SYSTEM_ADMIN)
    if (!isSystemAdmin(user.role)) {
      const serviceLineUsers = await prisma.serviceLineUser.findMany({
        where: { userId: user.id },
        select: { role: true },
      });
      
      const hasManagerRole = serviceLineUsers.some(slu => 
        hasServiceLineRole(slu.role, 'MANAGER')
      );

      if (!hasManagerRole) {
        throw new AppError(
          403,
          'You must have MANAGER or higher role to request changes',
          ErrorCodes.FORBIDDEN
        );
      }

      // Verify user has access to this client via service line
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { 
          id: true,
          Task: {
            select: {
              ServLineCode: true,
              SLGroup: true,
            },
            take: 1,
          },
        },
      });

      if (!client) {
        throw new AppError(404, 'Client not found', ErrorCodes.NOT_FOUND);
      }

      // Check if user has access to any task's service line for this client
      const userSubGroups = await getUserSubServiceLineGroups(user.id);
      const hasClientAccess = client.Task.some(task => {
        // Check if user has access to any sub-service line group of this client's tasks
        return userSubGroups.includes(task.SLGroup);
      });

      if (!hasClientAccess && client.Task.length > 0) {
        throw new AppError(
          403,
          'You do not have access to this client',
          ErrorCodes.FORBIDDEN
        );
      }
    }

    // Create the change request
    const changeRequest = await createChangeRequest(clientId, data, user.id);

    // Invalidate caches
    await Promise.all([
      invalidateClientCache(changeRequest.Client?.GSClientID ?? ''),
      invalidateClientListCache(),
    ]);

    return NextResponse.json(
      successResponse(changeRequest, { message: 'Change request created successfully' })
    );
  },
});

/**
 * GET /api/clients/[id]/change-requests
 * Get change request history for a client
 */
export const GET = secureRoute.queryWithParams<{ id: string }>({
  feature: Feature.ACCESS_CLIENTS,
  handler: async (request, { user, params }) => {
    const clientId = parseInt((params as { id: string }).id, 10);

    if (isNaN(clientId)) {
      throw new AppError(400, 'Invalid client ID', ErrorCodes.VALIDATION_ERROR);
    }

    // Validate query params
    const { searchParams } = new URL(request.url);
    const queryResult = ChangeRequestQuerySchema.safeParse({
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    if (!queryResult.success) {
      throw new AppError(
        400,
        'Invalid query parameters',
        ErrorCodes.VALIDATION_ERROR,
        { errors: queryResult.error.flatten() }
      );
    }

    const { status, page, limit } = queryResult.data;

    // Verify user has access to this client
    if (!isSystemAdmin(user.role)) {
      const userSubGroups = await getUserSubServiceLineGroups(user.id);
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: {
          id: true,
          Task: {
            select: {
              ServLineCode: true,
              SLGroup: true,
            },
            take: 1,
          },
        },
      });

      if (!client) {
        throw new AppError(404, 'Client not found', ErrorCodes.NOT_FOUND);
      }

      const hasClientAccess = client.Task.some(task => {
        return userSubGroups.includes(task.SLGroup);
      });

      if (!hasClientAccess && client.Task.length > 0) {
        throw new AppError(
          403,
          'You do not have access to this client',
          ErrorCodes.FORBIDDEN
        );
      }
    }

    // Get change requests
    const { requests, total } = await getChangeRequests(clientId, {
      status: status as ChangeRequestStatus | undefined,
      page,
      limit,
    });

    return NextResponse.json(
      successResponse({
        requests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    );
  },
});
