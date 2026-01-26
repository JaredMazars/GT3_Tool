import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { CreateLeaderGroupSchema } from '@/lib/validation/schemas';
import { logger } from '@/lib/utils/logger';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/leaders
 * Fetch all leader groups with member details
 * Admin only - requires ACCESS_ADMIN feature
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_ADMIN,
  handler: async (_request, { user }) => {
    try {
      const groups = await prisma.leaderGroup.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          createdAt: true,
          updatedAt: true,
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          LeaderGroupMember: {
            select: {
              id: true,
              addedAt: true,
              Employee: {
                select: {
                  id: true,
                  EmpCode: true,
                  EmpName: true,
                  EmpNameFull: true,
                  OfficeCode: true,
                  EmpCatCode: true,
                  EmpCatDesc: true,
                  ServLineDesc: true,
                  Active: true,
                },
              },
              User: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: {
              Employee: {
                EmpName: 'asc',
              },
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      logger.info('Leader groups fetched', {
        userId: user.id,
        groupCount: groups.length,
      });

      return NextResponse.json(successResponse(groups));
    } catch (error) {
      logger.error('Failed to fetch leader groups', error);
      throw new AppError(
        500,
        'Failed to fetch leader groups',
        ErrorCodes.INTERNAL_ERROR
      );
    }
  },
});

/**
 * POST /api/admin/leaders
 * Create a new leader group
 * Admin only - requires MANAGE_USERS feature
 */
export const POST = secureRoute.mutation({
  feature: Feature.MANAGE_USERS,
  schema: CreateLeaderGroupSchema,
  handler: async (_request, { user, data }) => {
    try {
      // Check if group name already exists
      const existingGroup = await prisma.leaderGroup.findUnique({
        where: { name: data.name },
        select: { id: true },
      });

      if (existingGroup) {
        throw new AppError(
          409,
          'A leader group with this name already exists',
          ErrorCodes.CONFLICT
        );
      }

      // Create the group
      const group = await prisma.leaderGroup.create({
        data: {
          name: data.name,
          description: data.description,
          type: data.type,
          createdById: user.id,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          createdAt: true,
          updatedAt: true,
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          LeaderGroupMember: true,
        },
      });

      logger.info('Leader group created', {
        userId: user.id,
        groupId: group.id,
        groupName: group.name,
      });

      return NextResponse.json(successResponse(group), { status: 201 });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to create leader group', error);
      throw new AppError(
        500,
        'Failed to create leader group',
        ErrorCodes.INTERNAL_ERROR
      );
    }
  },
});
