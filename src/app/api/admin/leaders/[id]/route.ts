import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { UpdateLeaderGroupSchema } from '@/lib/validation/schemas';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/leaders/[id]
 * Update a leader group's name and/or description
 * Admin only - requires MANAGE_USERS feature
 */
export const PUT = secureRoute.mutationWithParams<typeof UpdateLeaderGroupSchema, { id: string }>({
  feature: Feature.MANAGE_USERS,
  schema: UpdateLeaderGroupSchema,
  handler: async (request, { user, data, params }) => {
    try {
      const id = parseInt(params.id);

      if (isNaN(id)) {
        throw new AppError(400, 'Invalid group ID', ErrorCodes.VALIDATION_ERROR);
      }

      // Check if group exists
      const existingGroup = await prisma.leaderGroup.findUnique({
        where: { id },
        select: { id: true, name: true },
      });

      if (!existingGroup) {
        throw new AppError(404, 'Leader group not found', ErrorCodes.NOT_FOUND);
      }

      // If name is being changed, check for uniqueness
      if (data.name && data.name !== existingGroup.name) {
        const duplicateGroup = await prisma.leaderGroup.findUnique({
          where: { name: data.name },
          select: { id: true },
        });

        if (duplicateGroup) {
          throw new AppError(
            409,
            'A leader group with this name already exists',
            ErrorCodes.CONFLICT
          );
        }
      }

      // Update the group
      const updatedGroup = await prisma.leaderGroup.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
        },
        select: {
          id: true,
          name: true,
          description: true,
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
      });

      logger.info('Leader group updated', {
        userId: user.id,
        groupId: id,
        changes: data,
      });

      return NextResponse.json(successResponse(updatedGroup));
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to update leader group', error);
      throw new AppError(
        500,
        'Failed to update leader group',
        ErrorCodes.INTERNAL_ERROR
      );
    }
  },
});

/**
 * DELETE /api/admin/leaders/[id]
 * Delete a leader group (cascade deletes members)
 * Admin only - requires MANAGE_USERS feature
 */
export const DELETE = secureRoute.mutationWithParams<z.ZodSchema, { id: string }>({
  feature: Feature.MANAGE_USERS,
  handler: async (request, { user, params }) => {
    try {
      const id = parseInt(params.id);

      if (isNaN(id)) {
        throw new AppError(400, 'Invalid group ID', ErrorCodes.VALIDATION_ERROR);
      }

      // Check if group exists
      const existingGroup = await prisma.leaderGroup.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          _count: {
            select: { LeaderGroupMember: true },
          },
        },
      });

      if (!existingGroup) {
        throw new AppError(404, 'Leader group not found', ErrorCodes.NOT_FOUND);
      }

      // Delete the group (members will be cascade deleted)
      await prisma.leaderGroup.delete({
        where: { id },
      });

      logger.info('Leader group deleted', {
        userId: user.id,
        groupId: id,
        groupName: existingGroup.name,
        memberCount: existingGroup._count.LeaderGroupMember,
      });

      return NextResponse.json(
        successResponse({ 
          message: 'Leader group deleted successfully',
          deletedGroup: {
            id: existingGroup.id,
            name: existingGroup.name,
            memberCount: existingGroup._count.LeaderGroupMember,
          },
        })
      );
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to delete leader group', error);
      throw new AppError(
        500,
        'Failed to delete leader group',
        ErrorCodes.INTERNAL_ERROR
      );
    }
  },
});
