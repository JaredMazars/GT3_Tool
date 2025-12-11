import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { getUserServiceLines } from '@/lib/services/service-lines/serviceLineService';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError, AppError } from '@/lib/utils/errorHandler';
import { mapEmployeeCategoryToRole } from '@/lib/utils/serviceLineUtils';

/**
 * GET /api/service-lines/[serviceLine]/[subServiceLineGroup]/users
 * Fetch all employees in a sub-service line group with their task allocations
 * Now returns ALL employees (not just registered users) filtered by SubServLineCode
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { serviceLine: string; subServiceLineGroup: string } }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user?.id) {
      return handleApiError(new AppError(401, 'Unauthorized'), 'Get sub-service line employees');
    }
    // 2. Extract subServiceLineGroup from params
    const subServiceLineGroup = params.subServiceLineGroup;
    if (!subServiceLineGroup) {
      return handleApiError(new AppError(400, 'Sub-service line group is required'), 'Get sub-service line employees');
    }

    // 3. Check user has access to this sub-service line group
    const userServiceLines = await getUserServiceLines(user.id);
    const hasAccess = userServiceLines.some(sl => 
      sl.subGroups?.some((sg: any) => sg.code === subServiceLineGroup)
    );
    if (!hasAccess) {
      return handleApiError(
        new AppError(403, 'You do not have access to this sub-service line group'),
        'Get sub-service line employees'
      );
    }

    // 4. Map subServiceLineGroup to external service line codes via ServiceLineExternal
    const serviceLineExternalMappings = await prisma.serviceLineExternal.findMany({
      where: {
        SubServlineGroupCode: subServiceLineGroup
      },
      select: {
        ServLineCode: true,
        SubServlineGroupCode: true,
        SubServlineGroupDesc: true
      }
    });
    const externalServLineCodes = serviceLineExternalMappings
      .map(m => m.ServLineCode)
      .filter((code): code is string => !!code);

    if (externalServLineCodes.length === 0) {
      return NextResponse.json(successResponse({ users: [] }));
    }

    // 5. Get all employees whose ServLineCode matches any of the external codes
    const employees = await prisma.employee.findMany({
      where: {
        ServLineCode: { in: externalServLineCodes },
        Active: 'Yes',
        EmpDateLeft: null  // Only employees who haven't left
      },
      select: {
        id: true,
        GSEmployeeID: true,
        EmpCode: true,
        EmpName: true,
        EmpNameFull: true,
        OfficeCode: true,
        ServLineCode: true,
        ServLineDesc: true,
        SubServLineCode: true,
        SubServLineDesc: true,
        EmpCatDesc: true,
        EmpCatCode: true,
        Active: true,
        EmpDateLeft: true,
        WinLogon: true
      },
      orderBy: {
        EmpNameFull: 'asc'
      }
    });
    if (employees.length === 0) {
      return NextResponse.json(successResponse({ users: [] }));
    }

    // 6. Build email/username lookup arrays for User matching
    const winLogons = employees
      .map(emp => emp.WinLogon)
      .filter((logon): logon is string => !!logon);
    
    // Try both full email and username prefix
    const emailVariants = winLogons.flatMap(logon => {
      const lower = logon.toLowerCase();
      const prefix = lower.split('@')[0];
      return [lower, prefix].filter((v): v is string => !!v);
    });

    // 7. LEFT JOIN with User table to find registered users
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { in: emailVariants } },
          { id: { in: winLogons } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true
      }
    });

    // Create user lookup map (by email and email prefix)
    const userMap = new Map<string, typeof users[0]>();
    users.forEach(u => {
      const lowerEmail = u.email.toLowerCase();
      const emailPrefix = lowerEmail.split('@')[0];
      userMap.set(lowerEmail, u);
      if (emailPrefix) {
        userMap.set(emailPrefix, u);
      }
      userMap.set(u.id, u);
    });

    // 8. Get all tasks in this sub-service line group (using ServLineCode)
    const tasksInSubGroup = await prisma.task.findMany({
      where: {
        ServLineCode: { in: externalServLineCodes }
      },
      select: {
        id: true
      }
    });

    const taskIds = tasksInSubGroup.map(t => t.id);

    // 9. Get user IDs for employees that have User accounts
    const employeesWithUsers = employees
      .map(emp => {
        const winLogon = emp.WinLogon?.toLowerCase();
        if (!winLogon) return null;
        
        const winLogonPrefix = winLogon.split('@')[0];
        const matchedUser = userMap.get(winLogon) || 
                           (winLogonPrefix ? userMap.get(winLogonPrefix) : undefined);
        
        return matchedUser ? { employeeId: emp.id, userId: matchedUser.id } : null;
      })
      .filter((item): item is { employeeId: number; userId: string } => item !== null);

    const userIds = employeesWithUsers.map(item => item.userId);

    // 10. Get all allocations for users who have accounts
    // Note: We only filter by userId to avoid SQL Server parameter limit (2100)
    // Users in this service line may have allocations to tasks in other service lines
    const taskAllocations = userIds.length > 0 ? await prisma.taskTeam.findMany({
      where: {
        userId: { in: userIds },
        OR: [
          {
            startDate: { not: null },
            endDate: { not: null }
          }
        ]
      },
      select: {
        id: true,
        userId: true,
        taskId: true,
        role: true,
        startDate: true,
        endDate: true,
        allocatedHours: true,
        allocatedPercentage: true,
        actualHours: true,
        Task: {
          select: {
            TaskDesc: true,
            TaskCode: true,
            Client: {
              select: {
                clientCode: true,
                clientNameFull: true
              }
            }
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      }
    }) : [];

    // 11. Transform to response format
    const employeesWithAllocations = employees.map(employee => {
      const winLogon = employee.WinLogon?.toLowerCase();
      const winLogonPrefix = winLogon?.split('@')[0];
      const matchedUser = winLogon 
        ? (userMap.get(winLogon) || (winLogonPrefix ? userMap.get(winLogonPrefix) : undefined))
        : null;

      const hasUserAccount = !!matchedUser;
      const userId = matchedUser?.id || null;

      // Get allocations for this employee (if they have a user account)
      // In planner view, all allocations are editable (isCurrentTask: true)
      const userAllocations = userId
        ? taskAllocations
            .filter(alloc => alloc.userId === userId)
            .filter(alloc => alloc.startDate && alloc.endDate)
            .map(alloc => ({
              id: alloc.id,
              taskId: alloc.taskId,
              taskName: alloc.Task.TaskDesc,
              taskCode: alloc.Task.TaskCode,
              clientName: alloc.Task.Client?.clientNameFull || null,
              clientCode: alloc.Task.Client?.clientCode || null,
              role: alloc.role,
              startDate: alloc.startDate!,
              endDate: alloc.endDate!,
              allocatedHours: alloc.allocatedHours ? parseFloat(alloc.allocatedHours.toString()) : null,
              allocatedPercentage: alloc.allocatedPercentage,
              actualHours: alloc.actualHours ? parseFloat(alloc.actualHours.toString()) : null,
              isCurrentTask: true  // All allocations are editable in planner view
            }))
        : [];

      // Map employee category to service line role
      const serviceLineRole = mapEmployeeCategoryToRole(employee.EmpCatDesc);
      
      return {
        employeeId: employee.id,
        userId: userId,
        hasUserAccount: hasUserAccount,
        serviceLineRole: serviceLineRole,
        user: {
          id: userId || `employee-${employee.id}`, // Fallback ID for employees without user accounts
          name: matchedUser?.name || employee.EmpNameFull,
          email: matchedUser?.email || employee.WinLogon || '',
          image: matchedUser?.image || null,
          jobTitle: employee.EmpCatDesc,
          jobGradeCode: employee.EmpCatCode,
          officeLocation: employee.OfficeCode?.trim() || employee.OfficeCode
        },
        allocations: userAllocations
      };
    });

    return NextResponse.json(successResponse({ users: employeesWithAllocations }));
  } catch (error) {
    return handleApiError(error, 'Get sub-service line employees');
  }
}
