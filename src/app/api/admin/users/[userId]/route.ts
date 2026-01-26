import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users/[userId]
 * Get detailed user information
 * Admin only
 */
export const GET = secureRoute.queryWithParams<{ userId: string }>({
  feature: Feature.MANAGE_USERS,
  handler: async (request, { params }) => {
    if (!params.userId) {
      throw new AppError(400, 'User ID is required', ErrorCodes.VALIDATION_ERROR);
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        TaskTeam: {
          select: {
            id: true,
            role: true,
            createdAt: true,
            Task: {
              select: {
                id: true,
                TaskDesc: true,
                TaskCode: true,
                ServLineDesc: true,
                Client: {
                  select: {
                    id: true,
                    GSClientID: true,
                    clientCode: true,
                    clientNameFull: true,
                  },
                },
              },
            },
          },
          take: 100,
          orderBy: { createdAt: 'desc' },
        },
        Session: {
          select: {
            id: true,
            expires: true,
          },
          orderBy: {
            expires: 'desc',
          },
          take: 5,
        },
      },
    });

    if (!targetUser) {
      throw new AppError(404, 'User not found', ErrorCodes.NOT_FOUND);
    }

    return NextResponse.json(successResponse(targetUser));
  },
});

/**
 * DELETE /api/admin/users/[userId]
 * Remove user from all projects
 * Admin only
 */
export const DELETE = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_USERS,
  handler: async (request, { user, params }) => {
    if (!params.userId) {
      throw new AppError(400, 'User ID is required', ErrorCodes.VALIDATION_ERROR);
    }

    // Prevent self-deletion
    if (user.id === params.userId) {
      throw new AppError(400, 'Cannot remove yourself from projects', ErrorCodes.VALIDATION_ERROR);
    }

    // Remove user from all projects
    await prisma.taskTeam.deleteMany({
      where: { userId: params.userId },
    });

    return NextResponse.json(successResponse({
      message: 'User removed from all projects',
    }));
  },
});
