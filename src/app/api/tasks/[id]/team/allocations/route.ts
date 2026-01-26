import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { toTaskId } from '@/types/branded';
import { NON_CLIENT_EVENT_LABELS, NonClientEventType } from '@/types';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { enrichEmployeesWithStatus, getEmployeeStatus } from '@/lib/services/employees/employeeStatusService';
import { extractEmpCodeFromUserId } from '@/lib/utils/employeeCodeExtractor';

/**
 * GET /api/tasks/[id]/team/allocations
 * Fetch all team members and their allocations for a task
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  handler: async (request, { user, params }) => {
    // 2. Parse and validate task ID
    const taskId = toTaskId(parseTaskId(params.id));

    // 3. Check task access
    const accessResult = await checkTaskAccess(user.id, taskId, 'VIEWER');
    if (!accessResult.canAccess) {
      throw new AppError(403, 'Access denied', ErrorCodes.FORBIDDEN);
    }

    // 4. Fetch task with team members in a single optimized query
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        TaskDesc: true,
        TaskCode: true,
        TaskPartner: true,
        TaskManager: true,
        Client: {
          select: {
            clientCode: true,
            clientNameFull: true
          }
        },
        TaskTeam: {
          select: {
            id: true,
            userId: true,
            role: true,
            startDate: true,
            endDate: true,
            allocatedHours: true,
            allocatedPercentage: true,
            actualHours: true,
            User: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          },
          orderBy: [
            { User: { name: 'asc' } },
            { id: 'asc' },
          ],
          take: 200,
        }
      }
    });

    if (!task) {
      throw new AppError(404, 'Task not found', ErrorCodes.NOT_FOUND);
    }

    // 5. Fetch all other allocations for these team members
    const userIds = task.TaskTeam.map(member => member.userId);
    
    const otherAllocations = await prisma.taskTeam.findMany({
      where: {
        userId: { in: userIds },
        taskId: { not: taskId },
        startDate: { not: null },
        endDate: { not: null }
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
      orderBy: [
        { startDate: 'asc' },
        { id: 'asc' },
      ],
      take: 1000,
    });

    // 5b. Map users to employees to fetch non-client allocations
    // Get user emails for the team
    const userEmails = task.TaskTeam.map(member => member.User.email?.toLowerCase()).filter(Boolean);
    
    // Find employees matching these users (by email/WinLogon)
    const employees = await prisma.employee.findMany({
      where: {
        OR: [
          { WinLogon: { in: userEmails } },
          // Also try matching email prefix before @
          ...userEmails.map(email => {
            const prefix = email?.split('@')[0];
            return prefix ? { WinLogon: { contains: prefix } } : { id: -1 }; // Use impossible id if no prefix
          })
        ]
      },
      select: {
        id: true,
        EmpCode: true,
        WinLogon: true,
        EmpCatCode: true
      },
      take: 500,
    });

    // Create mapping: userId -> employeeId, userId -> jobGradeCode, and userId -> empCode
    const userToEmployeeMap = new Map<string, number>();
    const userToJobGradeMap = new Map<string, string>();
    const userToEmpCodeMap = new Map<string, string>();
    task.TaskTeam.forEach(member => {
      const userEmail = member.User.email?.toLowerCase();
      if (userEmail) {
        const userEmailPrefix = userEmail.split('@')[0];
        const matchedEmployee = employees.find(emp => {
          const empLogin = emp.WinLogon?.toLowerCase();
          if (!empLogin) return false;
          // Direct match or check if employee WinLogon starts with user email prefix
          return empLogin === userEmail || empLogin.startsWith(`${userEmailPrefix}@`);
        });
        if (matchedEmployee) {
          userToEmployeeMap.set(member.userId, matchedEmployee.id);
          if (matchedEmployee.EmpCatCode) {
            userToJobGradeMap.set(member.userId, matchedEmployee.EmpCatCode);
          }
          if (matchedEmployee.EmpCode) {
            userToEmpCodeMap.set(member.userId, matchedEmployee.EmpCode);
          }
        }
      }
    });

    // Fetch employee status for all team members
    const allEmpCodes = Array.from(userToEmpCodeMap.values());
    if (task.TaskPartner) allEmpCodes.push(task.TaskPartner);
    if (task.TaskManager) allEmpCodes.push(task.TaskManager);
    const employeeStatusMap = await enrichEmployeesWithStatus([...new Set(allEmpCodes)]);

    // Get non-client allocations for matched employees
    const employeeIds = Array.from(userToEmployeeMap.values());
    const nonClientAllocations = await prisma.nonClientAllocation.findMany({
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
        notes: true,
        createdAt: true
      },
      orderBy: [
        { startDate: 'asc' },
        { id: 'asc' },
      ],
      take: 500,
    });

    // 5c. Add partner/manager to team if they don't have User accounts
    // This ensures they show in the planner with a "No Account" indicator
    const additionalMembers: any[] = [];
    
    if (task.TaskPartner || task.TaskManager) {
      const employeeCodesToAdd: Array<{ code: string; role: 'PARTNER' | 'MANAGER' }> = [];
      
      // Check if partner is in team
      // We need to check if the SPECIFIC partner (by employee code) is in the team
      if (task.TaskPartner) {
        // First, get the partner's employee record to find their User account
        const partnerEmployee = await prisma.employee.findFirst({
          where: {
            EmpCode: task.TaskPartner,
            Active: 'Yes',
          },
          select: {
            EmpCode: true,
            WinLogon: true,
          },
        });
        
        // Check if this specific partner has a TaskTeam record by matching User email
        let partnerInTeam = false;
        if (partnerEmployee?.WinLogon) {
          const partnerWinLogonLower = partnerEmployee.WinLogon.toLowerCase();
          const partnerEmailPrefix = partnerEmployee.WinLogon.split('@')[0]?.toLowerCase();
          
          partnerInTeam = task.TaskTeam.some(m => {
            const userEmailLower = m.User.email?.toLowerCase();
            const userEmailPrefix = userEmailLower?.split('@')[0]?.toLowerCase();
            
            // Check if the User email matches the partner's WinLogon
            return userEmailLower === partnerWinLogonLower ||
                   userEmailLower === `${partnerWinLogonLower}@mazarsinafrica.onmicrosoft.com` ||
                   userEmailPrefix === partnerEmailPrefix;
          });
        }
        
        if (!partnerInTeam) {
          employeeCodesToAdd.push({ code: task.TaskPartner, role: 'PARTNER' });
        }
      }
      
      // Check if manager is in team (and not same as partner)
      if (task.TaskManager && task.TaskManager !== task.TaskPartner) {
        // Get the manager's employee record to find their User account
        const managerEmployee = await prisma.employee.findFirst({
          where: {
            EmpCode: task.TaskManager,
            Active: 'Yes',
          },
          select: {
            EmpCode: true,
            WinLogon: true,
          },
        });
        
        // Check if this specific manager has a TaskTeam record by matching User email
        let managerInTeam = false;
        if (managerEmployee?.WinLogon) {
          const managerWinLogonLower = managerEmployee.WinLogon.toLowerCase();
          const managerEmailPrefix = managerEmployee.WinLogon.split('@')[0]?.toLowerCase();
          
          managerInTeam = task.TaskTeam.some(m => {
            const userEmailLower = m.User.email?.toLowerCase();
            const userEmailPrefix = userEmailLower?.split('@')[0]?.toLowerCase();
            
            // Check if the User email matches the manager's WinLogon
            return userEmailLower === managerWinLogonLower ||
                   userEmailLower === `${managerWinLogonLower}@mazarsinafrica.onmicrosoft.com` ||
                   userEmailPrefix === managerEmailPrefix;
          });
        }
        
        if (!managerInTeam) {
          employeeCodesToAdd.push({ code: task.TaskManager, role: 'MANAGER' });
        }
      }
      
      if (employeeCodesToAdd.length > 0) {
        try {
          const missingEmployees = await prisma.employee.findMany({
            where: {
              EmpCode: { in: employeeCodesToAdd.map(e => e.code) },
              Active: 'Yes',
            },
            select: {
              EmpCode: true,
              EmpName: true,
              EmpNameFull: true,
              WinLogon: true,
              EmpCatCode: true,
            },
          });
          
          const empCodeToRole = new Map(employeeCodesToAdd.map(e => [e.code, e.role]));
          
          for (const emp of missingEmployees) {
            const role = empCodeToRole.get(emp.EmpCode);
            if (!role) continue;
            
            // Add placeholder member for partner/manager without account
            let empStatus = employeeStatusMap.get(emp.EmpCode);
            
            // Fallback: Direct lookup if not in map
            if (!empStatus && emp.EmpCode) {
              empStatus = (await getEmployeeStatus(emp.EmpCode)) ?? undefined;
            }
            
            additionalMembers.push({
              id: 0, // Placeholder
              userId: `pending-${emp.EmpCode}`,
              role,
              user: {
                id: `pending-${emp.EmpCode}`,
                name: emp.EmpNameFull || emp.EmpName || emp.EmpCode,
                email: emp.WinLogon || `${emp.EmpCode}@pending.local`,
                image: null,
                jobGradeCode: emp.EmpCatCode || null,
              },
              allocations: [],
              hasAccount: false,
              employeeStatus: empStatus || { isActive: true, hasUserAccount: false },
            });
          }
        } catch (error) {
          // Log error but don't fail the request
        }
      }
    }

    // 6. Transform to response format
    const teamMembersWithAllocations = task.TaskTeam.map(member => {
      // Current task allocation
      const currentAllocation = member.startDate && member.endDate ? [{
        id: member.id,
        taskId: task.id,
        taskName: task.TaskDesc,
        taskCode: task.TaskCode,
        clientName: task.Client?.clientNameFull || null,
        clientCode: task.Client?.clientCode || null,
        role: member.role,
        startDate: member.startDate,
        endDate: member.endDate,
        allocatedHours: member.allocatedHours ? parseFloat(member.allocatedHours.toString()) : null,
        allocatedPercentage: member.allocatedPercentage,
        actualHours: member.actualHours ? parseFloat(member.actualHours.toString()) : null,
        isCurrentTask: true,
        isNonClientEvent: false
      }] : [];

      // Other task allocations for this user
      const otherUserAllocations = otherAllocations
        .filter(alloc => alloc.userId === member.userId)
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
          isCurrentTask: false,
          isNonClientEvent: false
        }));

      // Non-client event allocations for this user
      const userEmployeeId = userToEmployeeMap.get(member.userId);
      const userNonClientAllocations = nonClientAllocations
        .filter(alloc => userEmployeeId && alloc.employeeId === userEmployeeId)
        .map(alloc => ({
          id: alloc.id,
          taskId: null,
          taskName: NON_CLIENT_EVENT_LABELS[alloc.eventType as NonClientEventType],
          taskCode: undefined,
          clientName: null,
          clientCode: null,
          role: 'VIEWER' as const,
          startDate: alloc.startDate,
          endDate: alloc.endDate,
          allocatedHours: parseFloat(alloc.allocatedHours.toString()),
          allocatedPercentage: alloc.allocatedPercentage,
          actualHours: null,
          isCurrentTask: false,
          isNonClientEvent: true,
          nonClientEventType: alloc.eventType,
          notes: alloc.notes
        }));

      const memberEmpCode = userToEmpCodeMap.get(member.userId);
      let empStatus = memberEmpCode ? employeeStatusMap.get(memberEmpCode) : undefined;
      
      // Fallback: Try extracting employee code from userId if no status found
      if (!empStatus) {
        const extractedEmpCode = extractEmpCodeFromUserId(member.userId);
        if (extractedEmpCode) {
          empStatus = employeeStatusMap.get(extractedEmpCode);
        }
      }
      
      return {
        id: member.id, // TaskTeam.id for the current task - needed for creating/updating allocations
        userId: member.userId,
        role: member.role, // Current task role
        user: {
          id: member.User.id,
          name: member.User.name,
          email: member.User.email || '',
          image: member.User.image,
          jobGradeCode: userToJobGradeMap.get(member.userId) || null
        },
        allocations: [...currentAllocation, ...otherUserAllocations, ...userNonClientAllocations],
        hasAccount: true,
        employeeStatus: empStatus,
      };
    });

    // Combine regular team members with additional members (partner/manager without accounts)
    const allMembers = [...additionalMembers, ...teamMembersWithAllocations];

    return NextResponse.json(successResponse({ teamMembers: allMembers }));
  },
});


