import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { successResponse, parseTaskId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { toTaskId } from '@/types/branded';
import { NON_CLIENT_EVENT_LABELS, NonClientEventType } from '@/types';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'allocations/route:70',message:'Task fetched for allocations',data:{taskId,taskPartner:task.TaskPartner,taskManager:task.TaskManager,teamCount:task.TaskTeam.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

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
        WinLogon: true,
        EmpCatCode: true
      },
      take: 500,
    });

    // Create mapping: userId -> employeeId and userId -> jobGradeCode
    const userToEmployeeMap = new Map<string, number>();
    const userToJobGradeMap = new Map<string, string>();
    task.TaskTeam.forEach(member => {
      const userEmail = member.User.email?.toLowerCase();
      if (userEmail) {
        const matchedEmployee = employees.find(emp => {
          const empLogin = emp.WinLogon?.toLowerCase();
          if (!empLogin) return false;
          // Direct match or prefix match
          return empLogin === userEmail || userEmail.startsWith(empLogin.split('@')[0] || '');
        });
        if (matchedEmployee) {
          userToEmployeeMap.set(member.userId, matchedEmployee.id);
          if (matchedEmployee.EmpCatCode) {
            userToJobGradeMap.set(member.userId, matchedEmployee.EmpCatCode);
          }
        }
      }
    });

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
      if (task.TaskPartner) {
        const partnerInTeam = task.TaskTeam.some(m => m.role === 'PARTNER');
        if (!partnerInTeam) {
          employeeCodesToAdd.push({ code: task.TaskPartner, role: 'PARTNER' });
        }
      }
      
      // Check if manager is in team (and not same as partner)
      if (task.TaskManager && task.TaskManager !== task.TaskPartner) {
        const managerInTeam = task.TaskTeam.some(m => m.role === 'MANAGER');
        if (!managerInTeam) {
          employeeCodesToAdd.push({ code: task.TaskManager, role: 'MANAGER' });
        }
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'allocations/route:200',message:'Checking for missing partner/manager',data:{taskId,employeeCodesToAdd:employeeCodesToAdd.map(e=>({code:e.code,role:e.role}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,C'})}).catch(()=>{});
      // #endregion
      
      if (employeeCodesToAdd.length > 0) {
        try {
          const missingEmployees = await prisma.employee.findMany({
            where: {
              EmpCode: { in: employeeCodesToAdd.map(e => e.code) },
            },
            select: {
              EmpCode: true,
              EmpName: true,
              EmpNameFull: true,
              WinLogon: true,
              EmpCatCode: true,
            },
          });
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'allocations/route:225',message:'Missing employees fetched',data:{taskId,foundCount:missingEmployees.length,employees:missingEmployees.map(e=>({code:e.EmpCode,name:e.EmpName}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          
          const empCodeToRole = new Map(employeeCodesToAdd.map(e => [e.code, e.role]));
          
          for (const emp of missingEmployees) {
            const role = empCodeToRole.get(emp.EmpCode);
            if (!role) continue;
            
            // Add placeholder member for partner/manager without account
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
            });
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'allocations/route:253',message:'Added missing member',data:{taskId,empCode:emp.EmpCode,role,name:emp.EmpNameFull||emp.EmpName},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
          }
        } catch (error) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'allocations/route:260',message:'Error fetching missing employees',data:{taskId,error:String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
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
      };
    });

    // Combine regular team members with additional members (partner/manager without accounts)
    const allMembers = [...additionalMembers, ...teamMembersWithAllocations];

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'allocations/route:327',message:'Final response',data:{taskId,totalMembers:allMembers.length,regularMembers:teamMembersWithAllocations.length,additionalMembers:additionalMembers.length,members:allMembers.map(m=>({role:m.role,hasAccount:m.hasAccount,name:m.user.name}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D,E'})}).catch(()=>{});
    // #endregion

    return NextResponse.json(successResponse({ teamMembers: allMembers }));
  },
});


