import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { AddTaskTeamSchema } from '@/lib/validation/schemas';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { emailService } from '@/lib/services/email/emailService';
import { notificationService } from '@/lib/services/notifications/notificationService';
import { createUserAddedNotification } from '@/lib/services/notifications/templates';
import { NotificationType } from '@/types/notification';
import { logger } from '@/lib/utils/logger';
import { validateAllocation, AllocationValidationError } from '@/lib/validation/taskAllocation';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { getUserServiceLineRole } from '@/lib/services/service-lines/getUserServiceLineRole';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { toTaskId } from '@/types/branded';

export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  handler: async (request, { user, params }) => {
    // Handle "new" route
    if (params?.id === 'new') {
      throw new AppError(404, 'Invalid route - project must be created first', ErrorCodes.NOT_FOUND);
    }
    
    const taskId = toTaskId(parseTaskId(params?.id));

    // Check project access
    const hasAccess = await checkTaskAccess(user.id, taskId);
    if (!hasAccess) {
      throw new AppError(403, 'Forbidden', ErrorCodes.FORBIDDEN);
    }

    // Get task details including client info
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        TaskDesc: true,
        TaskCode: true,
        Client: {
          select: {
            clientCode: true,
            clientNameFull: true,
          },
        },
      },
    });

    // Get all users on this project with Employee data
    const taskTeams = await prisma.taskTeam.findMany({
      where: { taskId },
      select: {
        id: true,
        taskId: true,
        userId: true,
        role: true,
        startDate: true,
        endDate: true,
        allocatedHours: true,
        allocatedPercentage: true,
        actualHours: true,
        createdAt: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
      take: 500,
    });

    // Batch fetch all employees for better performance
    const emailPrefixes = taskTeams.map(tt => tt.User.email.split('@')[0]).filter((p): p is string => !!p);
    const fullEmails = taskTeams.map(tt => tt.User.email);
    
    const employees = await prisma.employee.findMany({
      where: {
        AND: [
          {
            OR: [
              { WinLogon: { in: fullEmails } },
              { WinLogon: { in: emailPrefixes } },
            ],
          },
          { Active: 'Yes' },
        ],
      },
      select: {
        WinLogon: true,
        EmpCatDesc: true,
        OfficeCode: true,
      },
    });

    // Create a lookup map for O(1) access
    const employeeMap = new Map(
      employees.map(emp => [emp.WinLogon?.toLowerCase(), emp])
    );

    // Enrich with Employee data using the lookup map
    const enrichedTaskTeams = taskTeams.map((tt) => {
      const emailPrefix = tt.User.email.split('@')[0];
      const employee = employeeMap.get(tt.User.email.toLowerCase()) || 
                       (emailPrefix ? employeeMap.get(emailPrefix.toLowerCase()) : undefined);

      return {
        ...tt,
        taskName: task?.TaskDesc,
        taskCode: task?.TaskCode,
        clientName: task?.Client?.clientNameFull || null,
        clientCode: task?.Client?.clientCode || null,
        User: {
          ...tt.User,
          jobTitle: employee?.EmpCatDesc || null,
          officeLocation: employee?.OfficeCode || null,
        },
      };
    });
    return NextResponse.json(successResponse(enrichedTaskTeams));
  },
});

export const POST = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  schema: AddTaskTeamSchema,
  handler: async (request, { user, params, data: validatedData }) => {
    // Handle "new" route
    if (params?.id === 'new') {
      throw new AppError(404, 'Invalid route - project must be created first', ErrorCodes.NOT_FOUND);
    }
    
    const taskId = toTaskId(parseTaskId(params?.id));
    // Get project details
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { ServLineCode: true },
    });
    if (!task) {
      throw new AppError(404, 'Task not found', ErrorCodes.NOT_FOUND);
    }

    // Check authorization: user must be a project member OR service line admin
    const currentUserOnProject = await prisma.taskTeam.findFirst({
      where: {
        taskId,
        userId: user.id,
      },
    });
    // Check if user is service line admin
    // First, map ServLineCode to SubServlineGroupCode
    const serviceLineMapping = await prisma.serviceLineExternal.findFirst({
      where: { ServLineCode: task.ServLineCode },
      select: { SubServlineGroupCode: true },
    });
    let isServiceLineAdmin = false;
    if (serviceLineMapping?.SubServlineGroupCode) {
      const serviceLineAccess = await prisma.serviceLineUser.findUnique({
        where: {
          userId_subServiceLineGroup: {
            userId: user.id,
            subServiceLineGroup: serviceLineMapping.SubServlineGroupCode,
          },
        },
        select: { role: true },
      });
      isServiceLineAdmin = serviceLineAccess?.role === 'ADMINISTRATOR' || serviceLineAccess?.role === 'PARTNER';
    }
    
    // Get user from earlier check for role
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    const isSystemAdmin = currentUser?.role === 'SYSTEM_ADMIN';
    // Allow if user is: System Admin OR project member OR service line admin
    if (!currentUserOnProject && !isServiceLineAdmin && !isSystemAdmin) {
      throw new AppError(403, 'You must be a project member or service line admin to add users', ErrorCodes.FORBIDDEN);
    }

    let targetUserId = validatedData.userId;
    
    // Handle synthetic employee IDs from planner (format: "employee-{employeeId}")
    if (targetUserId?.startsWith('employee-')) {
      const idPart = targetUserId.split('-')[1];
      const employeeId = idPart ? parseInt(idPart) : NaN;
      
      if (!isNaN(employeeId)) {
        // Look up employee
        const employee = await prisma.employee.findUnique({
          where: { id: employeeId },
          select: {
            id: true,
            WinLogon: true,
            EmpName: true,
            EmpNameFull: true,
            EmpCode: true,
          },
        });
        
        if (employee?.WinLogon) {
          // Try to find existing user by email
          const existingUser = await prisma.user.findFirst({
            where: {
              OR: [
                { email: employee.WinLogon },
                { email: { startsWith: employee.WinLogon.split('@')[0] } },
              ],
            },
          });
          
          if (existingUser) {
            targetUserId = existingUser.id;
          } else {
            // Create user account for this employee
            const newUser = await prisma.user.create({
              data: {
                id: `emp_${employee.EmpCode}_${Date.now()}`,
                name: employee.EmpNameFull || employee.EmpName,
                email: employee.WinLogon,
                role: 'USER',
              },
            });
            targetUserId = newUser.id;
          }
        }
      }
    }

    // If no userId provided, try to find or create user from employee info
    if (!targetUserId && validatedData.employeeCode) {
      // Try to find existing user by email/winlogon
      if (validatedData.email) {
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: validatedData.email } },
              { email: { startsWith: validatedData.email.split('@')[0] } },
            ],
          },
        });

        if (existingUser) {
          targetUserId = existingUser.id;
        } else {
          // Create a new user account for this employee
          // Generate a unique ID based on employee code
          const newUserId = `emp_${validatedData.employeeCode}_${Date.now()}`;
          const newUser = await prisma.user.create({
            data: {
              id: newUserId,
              name: validatedData.displayName || validatedData.employeeCode,
              email: validatedData.email || `${validatedData.employeeCode}@pending.local`,
              role: 'USER',
            },
          });
          targetUserId = newUser.id;
        }
      }
    }

    if (!targetUserId) {
      throw new AppError(400, 'Unable to identify user. Please provide employee information.', ErrorCodes.VALIDATION_ERROR);
    }

    // Check if user exists in system
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });
    
    if (!targetUser) {
      throw new AppError(404, 'User not found in system', ErrorCodes.NOT_FOUND);
    }

    // Check if user is already on this task (prevent duplicates)
    const existingTeamMember = await prisma.taskTeam.findUnique({
      where: {
        taskId_userId: {
          taskId,
          userId: targetUserId,
        },
      },
      select: { id: true },
    });

    if (existingTeamMember) {
      throw new AppError(409, 'User is already a member of this project team', ErrorCodes.VALIDATION_ERROR);
    }

    // Auto-assign role based on user's ServiceLineRole for the task's sub-service line group
    let role = 'USER'; // Default role
    
    // Reuse task fetched earlier and get service line mapping
    const taskServiceLineMapping = await prisma.serviceLineExternal.findFirst({
      where: { ServLineCode: task.ServLineCode },
      select: { SubServlineGroupCode: true },
    });
    
    if (taskServiceLineMapping?.SubServlineGroupCode) {
      // Get user's ServiceLineRole for this sub-service line group
      const userRole = await getUserServiceLineRole(targetUserId, taskServiceLineMapping.SubServlineGroupCode);
      if (userRole) {
        role = userRole;
      }
    }
    
    const startDate = validatedData.startDate ? new Date(validatedData.startDate) : null;
    const endDate = validatedData.endDate ? new Date(validatedData.endDate) : null;
    const allocatedHours = validatedData.allocatedHours || null;
    const allocatedPercentage = validatedData.allocatedPercentage || null;

    try {
      await validateAllocation(
        taskId,
        targetUserId,
        startDate,
        endDate,
        role
      );
    } catch (error) {
      if (error instanceof AllocationValidationError) {
        throw new AppError(400, error.message, ErrorCodes.VALIDATION_ERROR, error.details);
      }
      throw error;
    }

    // Add user to project with allocation details
    const taskTeam = await prisma.taskTeam.create({
      data: {
        taskId,
        userId: targetUserId,
        role,
        startDate,
        endDate,
        allocatedHours,
        allocatedPercentage,
      },
      select: {
        id: true,
        taskId: true,
        userId: true,
        role: true,
        startDate: true,
        endDate: true,
        allocatedHours: true,
        allocatedPercentage: true,
        actualHours: true,
        createdAt: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Send email notification (non-blocking)
    try {
      // Get project details for email
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { TaskDesc: true },
      });

      if (task && taskTeam.User) {
        await emailService.sendUserAddedEmail(
          taskId,
          task.TaskDesc,
          'N/A',
          {
            id: taskTeam.User.id,
            name: taskTeam.User.name,
            email: taskTeam.User.email,
          },
          {
            id: user.id,
            name: user.name,
            email: user.email,
          },
          taskTeam.role
        );
      }
    } catch (emailError) {
      // Log email error but don't fail the request
      logger.error('Failed to send user added email:', emailError);
    }

    // Create in-app notification (non-blocking)
    try {
      const taskForNotification = await prisma.task.findUnique({
        where: { id: taskId },
        select: { 
          TaskDesc: true,
          ServLineCode: true,
          GSClientID: true,
          Client: {
            select: {
              id: true,
            },
          },
        },
      });

      if (taskForNotification) {
        // Get service line mapping for the notification URL
        const serviceLineMapping = await prisma.serviceLineExternal.findFirst({
          where: { ServLineCode: taskForNotification.ServLineCode },
          select: { 
            SubServlineGroupCode: true,
            masterCode: true,
          },
        });

        const notification = createUserAddedNotification(
          taskForNotification.TaskDesc,
          taskId,
          user.name || user.email,
          taskTeam.role,
          serviceLineMapping?.masterCode ?? undefined,
          serviceLineMapping?.SubServlineGroupCode ?? undefined,
          taskForNotification.Client?.id
        );

        await notificationService.createNotification(
          taskTeam.userId,
          NotificationType.USER_ADDED,
          notification.title,
          notification.message,
          taskId,
          notification.actionUrl,
          user.id
        );
      }
    } catch (notificationError) {
      // Log notification error but don't fail the request
      logger.error('Failed to create in-app notification:', notificationError);
    }

    // Invalidate planner cache (client and employee planners)
    await cache.invalidate(`${CACHE_PREFIXES.TASK}planner:clients`);
    await cache.invalidate(`${CACHE_PREFIXES.TASK}planner:employees`);

    return NextResponse.json(successResponse(taskTeam), { status: 201 });
  },
});

