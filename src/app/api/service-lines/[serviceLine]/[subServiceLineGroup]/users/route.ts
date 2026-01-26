import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserServiceLines } from '@/lib/services/service-lines/serviceLineService';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { mapEmployeeCategoryToRole } from '@/lib/utils/serviceLineUtils';
import { NON_CLIENT_EVENT_LABELS, NonClientEventType } from '@/types';
import { mapEmployeesToUsers } from '@/lib/services/employees/employeeService';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

interface SubGroupInfo {
  code: string;
  description?: string;
}

/**
 * GET /api/service-lines/[serviceLine]/[subServiceLineGroup]/users
 * Fetch all employees in a sub-service line group with their task allocations
 * Now returns ALL employees (not just registered users) filtered by SubServLineCode
 */
export const GET = secureRoute.queryWithParams<{ serviceLine: string; subServiceLineGroup: string }>({
  feature: Feature.ACCESS_DASHBOARD,
  handler: async (request, { user, params }) => {
    const { subServiceLineGroup } = params;
    
    if (!subServiceLineGroup) {
      throw new AppError(400, 'Sub-service line group is required', ErrorCodes.VALIDATION_ERROR);
    }

    // Check user has access to this sub-service line group
    const userServiceLines = await getUserServiceLines(user.id);
    const hasAccess = userServiceLines.some(sl => 
      sl.subGroups?.some((sg: SubGroupInfo) => sg.code === subServiceLineGroup)
    );
    if (!hasAccess) {
      throw new AppError(403, 'You do not have access to this sub-service line group', ErrorCodes.FORBIDDEN);
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
    // Optimization: Only fetch what we need
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

    // 6. Map Employees to Users efficiently
    const employeeUserMap = await mapEmployeesToUsers(employees);

    // 7. Get user IDs for employees that have User accounts
    const userIds = Array.from(employeeUserMap.values()).map(u => u.id);
    const employeeIds = employees.map(emp => emp.id);

    // 8. Fetch allocations in PARALLEL
    // Only fetch allocations for users in this list
    const [taskAllocations, nonClientAllocations] = await Promise.all([
      userIds.length > 0 ? prisma.taskTeam.findMany({
        where: {
          userId: { in: userIds },
          OR: [
            { startDate: { not: null }, endDate: { not: null } }
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
        orderBy: { startDate: 'asc' }
      }) : [],
      
      employeeIds.length > 0 ? prisma.nonClientAllocation.findMany({
        where: {
          employeeId: { in: employeeIds }
        },
        select: {
          id: true,
          employeeId: true,
          eventType: true,
          startDate: true,
          endDate: true,
          allocatedHours: true,
          allocatedPercentage: true,
          notes: true
        },
        orderBy: { startDate: 'asc' }
      }) : []
    ]);

    // 9. Create maps for allocations to avoid N^2 complexity during mapping
    const taskAllocMap = new Map<string, Array<typeof taskAllocations[number]>>();
    taskAllocations.forEach(alloc => {
      if (!taskAllocMap.has(alloc.userId)) {
        taskAllocMap.set(alloc.userId, []);
      }
      taskAllocMap.get(alloc.userId)!.push(alloc);
    });

    const nonClientAllocMap = new Map<number, Array<typeof nonClientAllocations[number]>>();
    nonClientAllocations.forEach(alloc => {
      if (!nonClientAllocMap.has(alloc.employeeId)) {
        nonClientAllocMap.set(alloc.employeeId, []);
      }
      nonClientAllocMap.get(alloc.employeeId)!.push(alloc);
    });

    // 10. Transform to response format
    const employeesWithAllocations = employees.map(employee => {
      const matchedUser = employeeUserMap.get(employee.id);
      const hasUserAccount = !!matchedUser;
      const userId = matchedUser?.id || null;

      // Get task allocations for this employee (if they have a user account)
      const userTaskAllocations = userId
        ? (taskAllocMap.get(userId) || [])
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
              isCurrentTask: true
            }))
        : [];

      // Get non-client allocations for this employee
      const userNonClientAllocations = (nonClientAllocMap.get(employee.id) || [])
        .map(alloc => ({
          id: alloc.id,
          taskId: null,
          taskName: NON_CLIENT_EVENT_LABELS[alloc.eventType as NonClientEventType] || alloc.eventType,
          taskCode: '',
          clientName: null,
          clientCode: null,
          role: 'VIEWER',
          startDate: alloc.startDate,
          endDate: alloc.endDate,
          allocatedHours: alloc.allocatedHours ? parseFloat(alloc.allocatedHours.toString()) : null,
          allocatedPercentage: alloc.allocatedPercentage,
          actualHours: null,
          isCurrentTask: true,
          isNonClientEvent: true,
          nonClientEventType: alloc.eventType,
          notes: alloc.notes
        }));

      // Combine task and non-client allocations
      const allAllocations = [...userTaskAllocations, ...userNonClientAllocations];

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
        allocations: allAllocations
      };
    });

    return NextResponse.json(successResponse({ users: employeesWithAllocations }));
  },
});
