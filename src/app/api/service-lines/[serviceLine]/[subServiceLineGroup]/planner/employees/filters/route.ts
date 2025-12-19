import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { getUserServiceLines } from '@/lib/services/service-lines/serviceLineService';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError, AppError } from '@/lib/utils/errorHandler';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { mapUsersToEmployees, mapEmployeesToUsers } from '@/lib/services/employees/employeeService';
import { NON_CLIENT_EVENT_CONFIG } from '@/types';

/**
 * GET /api/service-lines/[serviceLine]/[subServiceLineGroup]/planner/employees/filters
 * Fetch unique filter option values for employee planner filters
 * Returns distinct values for employees, job grades, offices, clients, and task categories
 * 
 * Performance optimizations:
 * - Redis caching (30min TTL for relatively static data)
 * - Optimized queries with Promise.all batching
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { serviceLine: string; subServiceLineGroup: string } }
) {
  const perfStart = Date.now();
  
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user?.id) {
      return handleApiError(new AppError(401, 'Unauthorized'), 'Get employee planner filters');
    }

    // 2. Extract and validate params
    const subServiceLineGroup = params.subServiceLineGroup;
    if (!subServiceLineGroup) {
      return handleApiError(new AppError(400, 'Sub-service line group is required'), 'Get employee planner filters');
    }

    // 3. Check user has access to this sub-service line group
    const userServiceLines = await getUserServiceLines(user.id);
    const hasAccess = userServiceLines.some(sl => 
      sl.subGroups?.some((sg: any) => sg.code === subServiceLineGroup)
    );
    if (!hasAccess) {
      return handleApiError(
        new AppError(403, 'You do not have access to this sub-service line group'),
        'Get employee planner filters'
      );
    }

    // 4. Build cache key
    const cacheKey = `${CACHE_PREFIXES.TASK}planner:employees:filters:${params.serviceLine}:${subServiceLineGroup}`;
    
    // Try cache first (30min TTL since filter options are relatively static)
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // 5. Map subServiceLineGroup to external service line codes
    const serviceLineExternalMappings = await prisma.serviceLineExternal.findMany({
      where: {
        SubServlineGroupCode: subServiceLineGroup
      },
      select: {
        ServLineCode: true
      }
    });
    
    const externalServLineCodes = serviceLineExternalMappings
      .map(m => m.ServLineCode)
      .filter((code): code is string => !!code);

    if (externalServLineCodes.length === 0) {
      const emptyResponse = {
        employees: [],
        jobGrades: [],
        offices: [],
        clients: [],
        taskCategories: []
      };
      await cache.set(cacheKey, emptyResponse, 1800); // 30 min
      return NextResponse.json(successResponse(emptyResponse));
    }

    // 6. Fetch all employees for this service line (from Employee table)
    const queryStart = Date.now();
    const employees = await prisma.employee.findMany({
      where: {
        ServLineCode: { in: externalServLineCodes },
        Active: 'Yes',
        EmpDateLeft: null  // Only employees who haven't left
      },
      select: {
        id: true,
        WinLogon: true,
        EmpNameFull: true,
        EmpCatCode: true,
        OfficeCode: true
      },
      orderBy: {
        EmpNameFull: 'asc'
      }
    });

    // 7. Fetch tasks with clients for this sub-service line group
    const tasksWithClients = await prisma.task.findMany({
      where: {
        ServLineCode: { in: externalServLineCodes },
        Active: 'Yes'
      },
      select: {
        GSClientID: true,
        Client: {
          select: {
            clientCode: true,
            clientNameFull: true
          }
        }
      },
      distinct: ['GSClientID']
    });

    // 8. Map employees to users to get email addresses
    const employeeUserMap = await mapEmployeesToUsers(employees);

    // 9. Extract unique values for filters
    
    // Employees (WinLogon as ID and name with email if available)
    const employeesSet = new Map<string, string>();
    employees.forEach(emp => {
      if (emp.WinLogon) {
        const user = employeeUserMap.get(emp.id);
        const email = user?.email || `${emp.WinLogon}@forvismazars.us`;
        const label = emp.EmpNameFull 
          ? `${emp.EmpNameFull} (${email})`
          : email;
        // Use WinLogon as the ID for filtering
        employeesSet.set(emp.WinLogon, label);
      }
    });

    // Job grades (unique job categories from Employee table)
    const jobGradesSet = new Set<string>();
    employees.forEach(emp => {
      if (emp.EmpCatCode) {
        jobGradesSet.add(emp.EmpCatCode);
      }
    });

    // Offices (unique office locations from Employee table)
    const officesSet = new Set<string>();
    employees.forEach(emp => {
      if (emp.OfficeCode) {
        officesSet.add(emp.OfficeCode.trim());
      }
    });

    // Clients (unique clients with tasks)
    const clientsSet = new Map<string, string>();
    tasksWithClients.forEach(task => {
      if (task.Client?.clientCode) {
        const label = task.Client.clientNameFull 
          ? `${task.Client.clientCode} - ${task.Client.clientNameFull}`
          : task.Client.clientCode;
        clientsSet.set(task.Client.clientCode, label);
      }
    });

    // Task categories (client + internal event types + no_planning)
    const taskCategories = [
      { id: 'client', label: 'Client Tasks' },
      { id: 'no_planning', label: 'No Planning (Unallocated)' },
      // Add internal event types from config
      ...Object.entries(NON_CLIENT_EVENT_CONFIG).map(([key, config]) => ({
        id: key,
        label: config.label
      }))
    ];

    // 10. Convert to sorted arrays
    const response = {
      employees: Array.from(employeesSet.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      
      jobGrades: Array.from(jobGradesSet)
        .map(grade => ({ id: grade, label: grade }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      
      offices: Array.from(officesSet)
        .map(office => ({ id: office, label: office }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      
      clients: Array.from(clientsSet.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      
      taskCategories: taskCategories
    };

    // Cache for 30 minutes
    await cache.set(cacheKey, response, 1800);

    return NextResponse.json(successResponse(response));
  } catch (error) {
    return handleApiError(error, 'Get employee planner filters');
  }
}
