import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError, AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { AddTaskTeamSchema } from '@/lib/validation/schemas';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { emailService } from '@/lib/services/email/emailService';
import { notificationService } from '@/lib/services/notifications/notificationService';
import { createUserAddedNotification } from '@/lib/services/notifications/templates';
import { NotificationType } from '@/types/notification';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';
import { toTaskId } from '@/types/branded';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const params = await context.params;
    
    // Handle "new" route
    if (params?.id === 'new') {
      return NextResponse.json(
        { error: 'Invalid route - project must be created first' },
        { status: 404 }
      );
    }
    
    const taskId = toTaskId(params?.id);

    // Check project access
    const hasAccess = await checkTaskAccess(user.id, taskId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
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
  } catch (error) {
    return handleApiError(error, 'Get Project Users');
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const params = await context.params;
    
    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/route.ts:138',message:'POST /api/tasks/[id]/users',data:{rawId:params?.id,userId:user.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    
    // Handle "new" route
    if (params?.id === 'new') {
      return NextResponse.json(
        { error: 'Invalid route - project must be created first' },
        { status: 404 }
      );
    }
    
    const taskId = toTaskId(params?.id);
    
    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/route.ts:152',message:'TaskId parsed',data:{taskId,rawId:params?.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F,G'})}).catch(()=>{});
    // #endregion

    // Get project details
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { ServLineCode: true },
    });
    
    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/route.ts:163',message:'Task lookup result',data:{taskId,found:!!task,servLineCode:task?.ServLineCode},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'G,H'})}).catch(()=>{});
    // #endregion

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check authorization: user must be a project member OR service line admin
    const currentUserOnProject = await prisma.taskTeam.findUnique({
      where: {
        taskId_userId: { taskId, userId: user.id },
      },
    });
    
    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/route.ts:175',message:'User project membership check',data:{userId:user.id,taskId,onProject:!!currentUserOnProject},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'I'})}).catch(()=>{});
    // #endregion

    // Check if user is service line admin
    // First, map ServLineCode to SubServlineGroupCode
    const serviceLineMapping = await prisma.serviceLineExternal.findFirst({
      where: { ServLineCode: task.ServLineCode },
      select: { SubServlineGroupCode: true },
    });
    
    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/route.ts:187',message:'Service line mapping',data:{servLineCode:task.ServLineCode,subGroup:serviceLineMapping?.SubServlineGroupCode},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'I'})}).catch(()=>{});
    // #endregion

    let isServiceLineAdmin = false;
    if (serviceLineMapping?.SubServlineGroupCode) {
      const serviceLineAccess = await prisma.serviceLineUser.findUnique({
        where: {
          userId_subServiceLineGroup: {
            userId: user.id,
            subServiceLineGroup: serviceLineMapping.SubServlineGroupCode,
          },
        },
      });
      isServiceLineAdmin = serviceLineAccess?.role === 'ADMINISTRATOR' || serviceLineAccess?.role === 'PARTNER';
      
      // #region agent log
      await fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/route.ts:203',message:'Service line access check',data:{userId:user.id,subGroup:serviceLineMapping.SubServlineGroupCode,hasAccess:!!serviceLineAccess,role:serviceLineAccess?.role,isAdmin:isServiceLineAdmin},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'I'})}).catch(()=>{});
      // #endregion
    }
    
    // Get user from earlier check for role
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    const isSystemAdmin = currentUser?.role === 'SYSTEM_ADMIN';
    
    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/route.ts:215',message:'Authorization summary',data:{onProject:!!currentUserOnProject,isServiceLineAdmin,isSystemAdmin,allowed:(currentUserOnProject || isServiceLineAdmin || isSystemAdmin)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'I,J'})}).catch(()=>{});
    // #endregion

    // Allow if user is: System Admin OR project member OR service line admin
    if (!currentUserOnProject && !isServiceLineAdmin && !isSystemAdmin) {
      return NextResponse.json(
        { error: 'You must be a project member or service line admin to add users' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/route.ts:228',message:'Request body',data:{body},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'K'})}).catch(()=>{});
    // #endregion
    
    const validatedData = AddTaskTeamSchema.parse(body);
    
    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/route.ts:235',message:'Validation passed',data:{userId:validatedData.userId,role:validatedData.role},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'K'})}).catch(()=>{});
    // #endregion

    let targetUserId = validatedData.userId;
    
    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/route.ts:242',message:'Target user ID',data:{targetUserId,isSyntheticId:targetUserId?.startsWith('employee-')},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'K,L'})}).catch(()=>{});
    // #endregion
    
    // Handle synthetic employee IDs from planner (format: "employee-{employeeId}")
    if (targetUserId?.startsWith('employee-')) {
      const employeeId = parseInt(targetUserId.split('-')[1]);
      
      // #region agent log
      await fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/route.ts:251',message:'Extracting employee ID from synthetic ID',data:{syntheticId:targetUserId,employeeId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'N'})}).catch(()=>{});
      // #endregion
      
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
        
        // #region agent log
        await fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/route.ts:269',message:'Employee lookup result',data:{employeeId,found:!!employee,email:employee?.WinLogon},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'N'})}).catch(()=>{});
        // #endregion
        
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
            
            // #region agent log
            await fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/route.ts:289',message:'Found existing user account',data:{userId:existingUser.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'N'})}).catch(()=>{});
            // #endregion
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
            
            // #region agent log
            await fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/route.ts:304',message:'Created new user account',data:{userId:newUser.id,email:newUser.email},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'N'})}).catch(()=>{});
            // #endregion
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
      // #region agent log
      await fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/route.ts:267',message:'No target user ID - returning 400',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'L'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: 'Unable to identify user. Please provide employee information.' },
        { status: 400 }
      );
    }

    // Check if user exists in system
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });
    
    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/route.ts:282',message:'Target user lookup',data:{targetUserId,found:!!targetUser},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'L,M'})}).catch(()=>{});
    // #endregion

    if (!targetUser) {
      // #region agent log
      await fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/route.ts:288',message:'User not found - returning 404',data:{targetUserId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'M'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: 'User not found in system' },
        { status: 404 }
      );
    }

    // Check if user is already on project
    const existingTaskTeam = await prisma.taskTeam.findUnique({
      where: {
        taskId_userId: {
          taskId,
          userId: targetUserId,
        },
      },
    });

    if (existingTaskTeam) {
      return NextResponse.json(
        { error: 'User is already on this project' },
        { status: 400 }
      );
    }

    // Add user to project
    const taskTeam = await prisma.taskTeam.create({
      data: {
        taskId,
        userId: targetUserId,
        role: validatedData.role || 'VIEWER',
      },
      include: {
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

    return NextResponse.json(successResponse(taskTeam), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return handleApiError(
        new AppError(400, message, ErrorCodes.VALIDATION_ERROR),
        'Add Project User'
      );
    }
    
    return handleApiError(error, 'Add Project User');
  }
}

