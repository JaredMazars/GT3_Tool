import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getUserServiceLines } from '@/lib/services/service-lines/serviceLineService';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { startOfDay } from 'date-fns';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { mapUsersToEmployees } from '@/lib/services/employees/employeeService';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

// Type for subGroup in userServiceLines
interface SubGroupInfo {
  code: string;
  description?: string;
}

// Query params validation schema
const ClientPlannerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  'clientCodes[]': z.array(z.string()).optional().default([]),
  'groupDescs[]': z.array(z.string()).optional().default([]),
  'partnerCodes[]': z.array(z.string()).optional().default([]),
  'taskCodes[]': z.array(z.string()).optional().default([]),
  'managerCodes[]': z.array(z.string()).optional().default([]),
});

// Type for cache response
interface ClientPlannerResponse {
  tasks: TaskRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

interface TaskRow {
  taskId: number;
  taskCode: string | null;
  taskName: string | null;
  taskManager: string | null;
  taskManagerName: string | null;
  taskPartner: string | null;
  taskPartnerName: string | null;
  clientId: number;
  clientCode: string | null;
  clientName: string | null;
  groupDesc: string | null;
  clientPartner: string | null;
  allocations: AllocationRow[];
}

interface AllocationRow {
  id: number;
  taskId: number;
  userId: string;
  employeeId: number | null;
  employeeName: string;
  employeeCode: string | null;
  jobGradeCode: string | null;
  officeLocation: string | null;
  role: string;
  startDate: Date;
  endDate: Date;
  allocatedHours: number | null;
  allocatedPercentage: number | null;
  actualHours: number | null;
}

/**
 * GET /api/service-lines/[serviceLine]/[subServiceLineGroup]/planner/clients
 * Fetch all tasks for service line (including those without allocations)
 * Returns Task → Employee Allocations with pagination support
 * 
 * Performance optimizations:
 * - Redis caching (5min TTL)
 * - Pagination (25 limit default)
 * - Optimized queries with Promise.all batching
 */
export const GET = secureRoute.queryWithParams<{ serviceLine: string; subServiceLineGroup: string }>({
  feature: Feature.ACCESS_DASHBOARD,
  handler: async (request, { user, params }) => {
    const { serviceLine, subServiceLineGroup } = params;
    
    if (!subServiceLineGroup) {
      throw new AppError(400, 'Sub-service line group is required', ErrorCodes.VALIDATION_ERROR);
    }

    // Check for SYSTEM_ADMIN first (bypasses all access checks)
    const isAdmin = user.systemRole === 'SYSTEM_ADMIN';
    
    if (!isAdmin) {
      // Check user has access to this sub-service line group
      const userServiceLines = await getUserServiceLines(user.id);
      const hasAccess = userServiceLines.some(sl =>
        sl.subGroups?.some((sg: SubGroupInfo) => sg.code === subServiceLineGroup)
      );
      if (!hasAccess) {
        throw new AppError(403, 'You do not have access to this sub-service line group', ErrorCodes.FORBIDDEN);
      }
    }

    // Parse and validate query params
    const searchParams = request.nextUrl.searchParams;
    const queryParams = ClientPlannerQuerySchema.parse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 25,
      'clientCodes[]': searchParams.getAll('clientCodes[]'),
      'groupDescs[]': searchParams.getAll('groupDescs[]'),
      'partnerCodes[]': searchParams.getAll('partnerCodes[]'),
      'taskCodes[]': searchParams.getAll('taskCodes[]'),
      'managerCodes[]': searchParams.getAll('managerCodes[]'),
    });
    
    const { page, limit } = queryParams;
    const clientCodes = queryParams['clientCodes[]'];
    const groupDescs = queryParams['groupDescs[]'];
    const partnerCodes = queryParams['partnerCodes[]'];
    const taskCodes = queryParams['taskCodes[]'];
    const managerCodes = queryParams['managerCodes[]'];

    // Build comprehensive cache key with array filters
    const cacheKey = `${CACHE_PREFIXES.TASK}planner:clients:${serviceLine}:${subServiceLineGroup}:clients:${clientCodes.join(',') || 'all'}:groups:${groupDescs.join(',') || 'all'}:partners:${partnerCodes.join(',') || 'all'}:tasks:${taskCodes.join(',') || 'all'}:managers:${managerCodes.join(',') || 'all'}:${page}:${limit}`;
    
    // Try cache first
    const cached = await cache.get<ClientPlannerResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // 6. Map subServiceLineGroup to external service line codes
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
      const emptyResponse = { 
        tasks: [], 
        pagination: { page, limit, total: 0, totalPages: 0, hasMore: false } 
      };
      await cache.set(cacheKey, emptyResponse, 300);
      return NextResponse.json(successResponse(emptyResponse));
    }

    // 7. Determine if filters are active
    const hasFilters = !!(clientCodes.length > 0 || groupDescs.length > 0 || partnerCodes.length > 0 || taskCodes.length > 0 || managerCodes.length > 0);

    // 8. Build task where conditions with ARRAY-BASED FILTERS AT DATABASE LEVEL
    const taskWhereConditions: any = {
      ServLineCode: { in: externalServLineCodes },
      GSClientID: { not: null }, // Only client tasks
      Active: 'Yes', // Only active tasks (exclude archived)
    };

    // Add client filters using IN operator for OR logic within each filter type
    const clientFilters: any = {};
    
    if (clientCodes.length > 0) {
      clientFilters.clientCode = { in: clientCodes };
    }
    
    if (groupDescs.length > 0) {
      clientFilters.groupDesc = { in: groupDescs };
    }
    
    if (partnerCodes.length > 0) {
      clientFilters.clientPartner = { in: partnerCodes };
    }

    // Apply client filters if any exist
    if (Object.keys(clientFilters).length > 0) {
      taskWhereConditions.Client = clientFilters;
    }

    // Add task-level filters
    if (taskCodes.length > 0) {
      taskWhereConditions.TaskCode = { in: taskCodes };
    }
    
    if (managerCodes.length > 0) {
      taskWhereConditions.TaskManager = { in: managerCodes };
    }

    // 9. Apply pagination (always paginate, even with filters)
    const offset = (page - 1) * limit;

    // Fetch ALL tasks matching service line and filters (including those without allocations)
    const [tasks, totalCount] = await Promise.all([
      prisma.task.findMany({
        where: taskWhereConditions,
        select: {
          id: true,
          TaskDesc: true,
          TaskCode: true,
          TaskManager: true,
          TaskManagerName: true,
          TaskPartner: true,
          TaskPartnerName: true,
          GSClientID: true,
          Client: {
            select: {
              id: true,
              GSClientID: true,
              clientCode: true,
              clientNameFull: true,
              groupDesc: true,
              clientPartner: true
            }
          }
        },
        orderBy: [
          { Client: { clientNameFull: 'asc' } },
          { TaskDesc: 'asc' }
        ],
        take: limit,
        skip: offset
      }),
      // Get total count for pagination (all tasks matching filters)
      prisma.task.count({ 
        where: taskWhereConditions
      })
    ]);

    // 12. Tasks are already filtered by database, no need for in-memory filtering
    const filteredTasks = tasks;

    // 13. Fetch TaskTeam data for filtered tasks
    const taskIds = filteredTasks.map(t => t.id);
    
    if (taskIds.length === 0) {
      const emptyResponse = { 
        tasks: [], 
        pagination: { 
          page, 
          limit, 
          total: hasFilters ? 0 : totalCount, 
          totalPages: 0, 
          hasMore: false 
        } 
      };
      await cache.set(cacheKey, emptyResponse, 300);
      return NextResponse.json(successResponse(emptyResponse));
    }

    const taskTeamMembers = await prisma.taskTeam.findMany({
      where: {
        taskId: { in: taskIds }
        // Removed startDate/endDate filters to show all team members (including unallocated)
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
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });

    // 14. Get user IDs and fetch Employee data using shared service
    const userIds = [...new Set(taskTeamMembers.map(member => member.userId))];
    const employeeFetchStart = Date.now();
    
    const employeeMap = await mapUsersToEmployees(userIds);

    // 16. Group TaskTeam by taskId for easy lookup
    const taskTeamMap = new Map<number, typeof taskTeamMembers>();
    taskTeamMembers.forEach(member => {
      if (!taskTeamMap.has(member.taskId)) {
        taskTeamMap.set(member.taskId, []);
      }
      taskTeamMap.get(member.taskId)!.push(member);
    });

    // Build flat task rows with employee allocations
    const taskRows = filteredTasks
      .map(task => {
        if (!task.Client || !task.Client.GSClientID) return null;

        // Get team members for this task
        const teamMembers = taskTeamMap.get(task.id) || [];

        // Build employee allocations for this task
        const allocations = teamMembers
          .filter(member => member.startDate && member.endDate)
          .map(member => {
            const employee = employeeMap.get(member.userId.toLowerCase()) || 
                            employeeMap.get(member.userId.split('@')[0]?.toLowerCase() || '');

            return {
              id: member.id,
              taskId: task.id,
              userId: member.userId,
              employeeId: employee?.id || null,
              employeeName: member.User?.name || employee?.EmpNameFull || member.userId,
              employeeCode: employee?.EmpCode || null,
              jobGradeCode: employee?.EmpCatCode || null,
              officeLocation: employee?.OfficeCode?.trim() || null,
              role: member.role,
              startDate: startOfDay(member.startDate!),
              endDate: startOfDay(member.endDate!),
              allocatedHours: member.allocatedHours ? parseFloat(member.allocatedHours.toString()) : null,
              allocatedPercentage: member.allocatedPercentage,
              actualHours: member.actualHours ? parseFloat(member.actualHours.toString()) : null
            };
          });

        // Include all tasks, even those without allocations (users need to see them to plan)
        return {
          taskId: task.id,
          taskCode: task.TaskCode,
          taskName: task.TaskDesc,
          taskManager: task.TaskManager,
          taskManagerName: task.TaskManagerName,
          taskPartner: task.TaskPartner,
          taskPartnerName: task.TaskPartnerName,
          clientId: task.Client.id,
          clientCode: task.Client.clientCode,
          clientName: task.Client.clientNameFull || task.Client.clientCode,
          groupDesc: task.Client.groupDesc,
          clientPartner: task.Client.clientPartner,
          allocations
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => {
        // Sort by client name, then task name
        const clientCompare = a.clientName.localeCompare(b.clientName);
        if (clientCompare !== 0) return clientCompare;
        return a.taskName.localeCompare(b.taskName);
      });

    // 18. Build pagination metadata
    const finalTotal = totalCount;
    const response = {
      tasks: taskRows,
      pagination: {
        page,
        limit,
        total: finalTotal,
        totalPages: Math.ceil(finalTotal / limit),
        hasMore: finalTotal > (page * limit)
      }
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, response, 300);

    return NextResponse.json(successResponse(response));
  },
});
