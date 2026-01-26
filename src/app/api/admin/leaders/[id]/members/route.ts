import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { AddLeaderGroupMembersSchema } from '@/lib/validation/schemas';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/leaders/[id]/members
 * Add members to a leader group
 * Admin only - requires MANAGE_USERS feature
 */
export const POST = secureRoute.mutationWithParams<typeof AddLeaderGroupMembersSchema, { id: string }>({
  feature: Feature.MANAGE_USERS,
  schema: AddLeaderGroupMembersSchema,
  handler: async (request, { user, data, params }) => {
    try {
      const groupId = parseInt(params.id);

      if (isNaN(groupId)) {
        throw new AppError(400, 'Invalid group ID', ErrorCodes.VALIDATION_ERROR);
      }

      // Check if group exists
      const existingGroup = await prisma.leaderGroup.findUnique({
        where: { id: groupId },
        select: { id: true, name: true, type: true },
      });

      if (!existingGroup) {
        throw new AppError(404, 'Leader group not found', ErrorCodes.NOT_FOUND);
      }

      // Validation for INDIVIDUAL type
      if (existingGroup.type === 'INDIVIDUAL') {
        // Check if already has a member
        const existingMemberCount = await prisma.leaderGroupMember.count({
          where: { leaderGroupId: groupId },
        });

        if (existingMemberCount > 0 && data.employeeIds.length > 0) {
          throw new AppError(
            400,
            'Individual leader roles can only have one person. Please remove the current assignee first.',
            ErrorCodes.VALIDATION_ERROR
          );
        }

        if (data.employeeIds.length > 1) {
          throw new AppError(
            400,
            'Individual leader roles can only have one person at a time.',
            ErrorCodes.VALIDATION_ERROR
          );
        }
      }

      // Validate that all employees exist and are active
      const employees = await prisma.employee.findMany({
        where: {
          id: { in: data.employeeIds },
        },
        select: {
          id: true,
          Active: true,
          EmpName: true,
        },
      });

      if (employees.length !== data.employeeIds.length) {
        const foundIds = employees.map((e) => e.id);
        const missingIds = data.employeeIds.filter((id) => !foundIds.includes(id));
        throw new AppError(
          404,
          `Employees not found: ${missingIds.join(', ')}`,
          ErrorCodes.NOT_FOUND
        );
      }

      // Check that all employees are active
      const inactiveEmployees = employees.filter((e) => e.Active !== 'Yes');
      if (inactiveEmployees.length > 0) {
        throw new AppError(
          400,
          `Cannot add inactive employees: ${inactiveEmployees
            .map((e) => e.EmpName)
            .join(', ')}`,
          ErrorCodes.VALIDATION_ERROR
        );
      }

      // Get existing members to filter out duplicates (SQL Server doesn't support skipDuplicates)
      const existingMembers = await prisma.leaderGroupMember.findMany({
        where: {
          leaderGroupId: groupId,
          employeeId: { in: data.employeeIds },
        },
        select: { employeeId: true },
      });

      const existingEmployeeIds = new Set(existingMembers.map((m) => m.employeeId));
      const newEmployeeIds = data.employeeIds.filter((id) => !existingEmployeeIds.has(id));

      // Only insert new members (skip duplicates)
      if (newEmployeeIds.length > 0) {
        await prisma.leaderGroupMember.createMany({
          data: newEmployeeIds.map((employeeId) => ({
            leaderGroupId: groupId,
            employeeId,
            addedById: user.id,
          })),
        });
      }

      // Fetch the updated group with all members
      const updatedGroup = await prisma.leaderGroup.findUnique({
        where: { id: groupId },
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

      logger.info('Members added to leader group', {
        userId: user.id,
        groupId,
        groupName: existingGroup.name,
        addedCount: data.employeeIds.length,
      });

      return NextResponse.json(successResponse(updatedGroup));
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to add members to leader group', error);
      throw new AppError(
        500,
        'Failed to add members to leader group',
        ErrorCodes.INTERNAL_ERROR
      );
    }
  },
});

/**
 * DELETE /api/admin/leaders/[id]/members?employeeId=X
 * Remove a member from a leader group
 * Admin only - requires MANAGE_USERS feature
 */
export const DELETE = secureRoute.mutationWithParams<z.ZodSchema, { id: string }>({
  feature: Feature.MANAGE_USERS,
  handler: async (request: NextRequest, { user, params }) => {
    try {
      const groupId = parseInt(params.id);
      const { searchParams } = new URL(request.url);
      const employeeIdParam = searchParams.get('employeeId');

      if (isNaN(groupId)) {
        throw new AppError(400, 'Invalid group ID', ErrorCodes.VALIDATION_ERROR);
      }

      if (!employeeIdParam) {
        throw new AppError(
          400,
          'employeeId query parameter is required',
          ErrorCodes.VALIDATION_ERROR
        );
      }

      const employeeId = parseInt(employeeIdParam);
      if (isNaN(employeeId)) {
        throw new AppError(400, 'Invalid employee ID', ErrorCodes.VALIDATION_ERROR);
      }

      // Check if group exists
      const existingGroup = await prisma.leaderGroup.findUnique({
        where: { id: groupId },
        select: { id: true, name: true },
      });

      if (!existingGroup) {
        throw new AppError(404, 'Leader group not found', ErrorCodes.NOT_FOUND);
      }

      // Check if member exists
      const member = await prisma.leaderGroupMember.findUnique({
        where: {
          leaderGroupId_employeeId: {
            leaderGroupId: groupId,
            employeeId,
          },
        },
        select: {
          id: true,
          Employee: {
            select: {
              EmpName: true,
            },
          },
        },
      });

      if (!member) {
        throw new AppError(
          404,
          'Employee is not a member of this group',
          ErrorCodes.NOT_FOUND
        );
      }

      // Remove the member
      await prisma.leaderGroupMember.delete({
        where: {
          leaderGroupId_employeeId: {
            leaderGroupId: groupId,
            employeeId,
          },
        },
      });

      // Fetch the updated group with remaining members
      const updatedGroup = await prisma.leaderGroup.findUnique({
        where: { id: groupId },
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

      logger.info('Member removed from leader group', {
        userId: user.id,
        groupId,
        groupName: existingGroup.name,
        removedEmployeeId: employeeId,
        removedEmployeeName: member.Employee.EmpName,
      });

      return NextResponse.json(successResponse(updatedGroup));
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to remove member from leader group', error);
      throw new AppError(
        500,
        'Failed to remove member from leader group',
        ErrorCodes.INTERNAL_ERROR
      );
    }
  },
});
