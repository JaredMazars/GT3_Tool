import { NextRequest, NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { logger } from '@/lib/utils/logger';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { toTaskId } from '@/types/branded';
import { successResponse } from '@/lib/utils/apiUtils';

// ============================================================================
// GET /api/tasks/[taskId]/independence
// Fetch independence confirmations for all team members on a task
// ============================================================================

export const GET = secureRoute.queryWithParams({
  taskIdParam: 'id',
  feature: Feature.ACCESS_TASKS,
  handler: async (request, { user, params }) => {
    const taskId = toTaskId(params.id);

    // Verify user has access to this task (checks system admin, service line admin, and team membership)
    const accessResult = await checkTaskAccess(user.id, taskId);

    if (!accessResult.canAccess) {
      throw new AppError(
        403,
        'You do not have access to this task',
        ErrorCodes.FORBIDDEN
      );
    }

    // Fetch all team members (including partner and manager from Task table)
    // Fetch task details to get Partner and Manager EmpCodes
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        TaskPartner: true,
        TaskPartnerName: true,
        TaskManager: true,
        TaskManagerName: true,
      },
    });

    if (!task) {
      throw new AppError(404, 'Task not found', ErrorCodes.NOT_FOUND);
    }

    // Fetch task team members with User data
    const taskTeams = await prisma.taskTeam.findMany({
      where: { taskId },
      select: {
        id: true,
        userId: true,
        role: true,
        createdAt: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        TaskIndependenceConfirmation: {
          select: {
            id: true,
            taskTeamId: true,
            confirmed: true,
            confirmedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Collect all EmpCodes and emails to fetch from Employee table
    const userEmails = taskTeams.map(tt => tt.User.email).filter((email): email is string => !!email);
    const emailPrefixes = userEmails.map(email => email.split('@')[0]).filter((prefix): prefix is string => !!prefix);
    const empCodes = [task.TaskPartner, task.TaskManager].filter((code): code is string => !!code);

    // Fetch ALL employees (partner, manager, and any team members)
    const employees = await prisma.employee.findMany({
      where: {
        OR: [
          { EmpCode: { in: empCodes } },
          { WinLogon: { in: userEmails } },
          { WinLogon: { in: emailPrefixes } },
        ],
        Active: 'Yes',
      },
      select: {
        EmpCode: true,
        EmpName: true,
        EmpNameFull: true,
        WinLogon: true,
        OfficeCode: true,
        EmpCatDesc: true,
      },
    });

    // Create maps for quick lookup
    const employeeByCode = new Map(employees.map(emp => [emp.EmpCode, emp]));
    const employeeByEmail = new Map();
    employees.forEach(emp => {
      if (emp.WinLogon) {
        employeeByEmail.set(emp.WinLogon.toLowerCase(), emp);
        const prefix = emp.WinLogon.split('@')[0];
        if (prefix) {
          employeeByEmail.set(prefix.toLowerCase(), emp);
        }
      }
    });

    // Build the team members list:
    // 1. Start with TaskTeam members (have User accounts)
    const teamMembersWithAccounts = taskTeams.map(tt => {
      const userEmail = tt.User.email?.toLowerCase() || '';
      const emailPrefix = userEmail.split('@')[0];
      const employee = employeeByEmail.get(userEmail) || employeeByEmail.get(emailPrefix);

      return {
        ...tt,
        Employee: employee || null,
        hasAccount: true,
      };
    });

    // 2. Add Partner and Manager if they DON'T have TaskTeam entries
    const additionalEmployees = [];
    const processedEmpCodes = new Set(
      teamMembersWithAccounts.map(tm => tm.Employee?.EmpCode).filter((code): code is string => !!code)
    );

    // Add Partner if not already in TaskTeam
    if (task.TaskPartner && !processedEmpCodes.has(task.TaskPartner)) {
      const partnerEmployee = employeeByCode.get(task.TaskPartner);
      if (partnerEmployee) {
        additionalEmployees.push({
          id: 0, // No TaskTeam id
          userId: null as any,
          role: 'PARTNER',
          createdAt: new Date().toISOString() as any,
          User: null as any,
          Employee: partnerEmployee,
          hasAccount: false,
          TaskIndependenceConfirmation: null,
        });
      }
    }

    // Add Manager if not already in TaskTeam
    if (task.TaskManager && !processedEmpCodes.has(task.TaskManager)) {
      const managerEmployee = employeeByCode.get(task.TaskManager);
      if (managerEmployee) {
        additionalEmployees.push({
          id: 0, // No TaskTeam id
          userId: null as any,
          role: 'MANAGER',
          createdAt: new Date().toISOString() as any,
          User: null as any,
          Employee: managerEmployee,
          hasAccount: false,
          TaskIndependenceConfirmation: null,
        });
      }
    }

    // Merge all team members
    const teamMembers = [...teamMembersWithAccounts, ...additionalEmployees];

    logger.info('Independence confirmations fetched', {
      taskId,
      userId: user.id,
      teamMembersCount: teamMembers.length,
    });

    return NextResponse.json(successResponse({ teamMembers }));
  },
});

// ============================================================================
// POST /api/tasks/[taskId]/independence
// Confirm independence for the current user
// ============================================================================

const confirmIndependenceSchema = z.object({
  taskTeamId: z.number().int().positive(),
});

export const POST = secureRoute.mutation({
  feature: Feature.ACCESS_TASKS,
  schema: confirmIndependenceSchema,
  handler: async (request, { user, data }) => {
    const { taskTeamId } = data;

    // Verify the task team member exists and belongs to the current user
    const taskTeamMember = await prisma.taskTeam.findUnique({
      where: { id: taskTeamId },
      select: {
        id: true,
        userId: true,
        taskId: true,
        TaskIndependenceConfirmation: {
          select: {
            id: true,
            confirmed: true,
          },
        },
      },
    });

    if (!taskTeamMember) {
      throw new AppError(
        404,
        'Task team member not found',
        ErrorCodes.NOT_FOUND
      );
    }

    // Verify the user is confirming their own independence
    if (taskTeamMember.userId !== user.id) {
      throw new AppError(
        403,
        'You can only confirm your own independence',
        ErrorCodes.FORBIDDEN
      );
    }

    // Check if already confirmed
    if (taskTeamMember.TaskIndependenceConfirmation?.confirmed) {
      throw new AppError(
        400,
        'Independence already confirmed',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Create or update independence confirmation
    const confirmation = await prisma.taskIndependenceConfirmation.upsert({
      where: { taskTeamId },
      create: {
        taskTeamId,
        confirmed: true,
        confirmedAt: new Date(),
        updatedAt: new Date(),
      },
      update: {
        confirmed: true,
        confirmedAt: new Date(),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        taskTeamId: true,
        confirmed: true,
        confirmedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info('Independence confirmed', {
      taskId: taskTeamMember.taskId,
      userId: user.id,
      taskTeamId,
      confirmationId: confirmation.id,
    });

    return NextResponse.json(successResponse({ confirmation }));
  },
});
