export const dynamic = 'force-dynamic';

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

// Query params validation schema
const GlobalClientPlannerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  'clientCodes[]': z.array(z.string()).optional().default([]),
  'groupDescs[]': z.array(z.string()).optional().default([]),
  'partnerCodes[]': z.array(z.string()).optional().default([]),
  'taskCodes[]': z.array(z.string()).optional().default([]),
  'managerCodes[]': z.array(z.string()).optional().default([]),
  'serviceLines[]': z.array(z.string()).optional().default([]),
  'subServiceLineGroups[]': z.array(z.string()).optional().default([]),
});

// Type for cache response
interface GlobalClientPlannerResponse {
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
  serviceLine: string | null;
  subServiceLineGroup: string | null;
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
 * GET /api/planner/clients
 * Global client planner - fetch tasks and allocations across all service lines
 * Requires Country Management access
 * 
 * Performance optimizations:
 * - Redis caching (5min TTL)
 * - Pagination (25 limit default)
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_DASHBOARD,
  handler: async (request, { user }) => {
    // Check for SYSTEM_ADMIN first (bypasses all access checks)
    const isAdmin = user.systemRole === 'SYSTEM_ADMIN';
    
    if (!isAdmin) {
      // Check user has Country Management access
      const userServiceLines = await getUserServiceLines(user.id);
      const hasCountryMgmtAccess = userServiceLines.some(
        sl => sl.serviceLine === 'COUNTRY_MANAGEMENT'
      );
      
      if (!hasCountryMgmtAccess) {
        throw new AppError(403, 'Staff Planner requires Country Management access', ErrorCodes.FORBIDDEN);
      }
    }

    // Parse and validate query params
    const searchParams = request.nextUrl.searchParams;
    const queryParams = GlobalClientPlannerQuerySchema.parse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 25,
      'clientCodes[]': searchParams.getAll('clientCodes[]'),
      'groupDescs[]': searchParams.getAll('groupDescs[]'),
      'partnerCodes[]': searchParams.getAll('partnerCodes[]'),
      'taskCodes[]': searchParams.getAll('taskCodes[]'),
      'managerCodes[]': searchParams.getAll('managerCodes[]'),
      'serviceLines[]': searchParams.getAll('serviceLines[]'),
      'subServiceLineGroups[]': searchParams.getAll('subServiceLineGroups[]'),
    });
    
    const { page, limit } = queryParams;
    const clientCodes = queryParams['clientCodes[]'];
    const groupDescs = queryParams['groupDescs[]'];
    const partnerCodes = queryParams['partnerCodes[]'];
    const taskCodes = queryParams['taskCodes[]'];
    const managerCodes = queryParams['managerCodes[]'];
    const serviceLineFilters = queryParams['serviceLines[]'];
    const subServiceLineGroupFilters = queryParams['subServiceLineGroups[]'];

    // Build cache key
    const cacheKey = `${CACHE_PREFIXES.TASK}global-planner:clients:sl:${serviceLineFilters.join(',') || 'all'}:sslg:${subServiceLineGroupFilters.join(',') || 'all'}:clients:${clientCodes.join(',') || 'all'}:groups:${groupDescs.join(',') || 'all'}:partners:${partnerCodes.join(',') || 'all'}:tasks:${taskCodes.join(',') || 'all'}:managers:${managerCodes.join(',') || 'all'}:${page}:${limit}`;
    
    // Try cache first
    const cached = await cache.get<GlobalClientPlannerResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // Get external service line codes based on filters
    let externalServLineCodes: string[] = [];
    
    // OPTIMIZATION: Consolidate redundant service line mapping queries into a single query
    // Build conditional where clause and fetch all needed fields at once
    const mappingWhere: any = {};
    
    if (subServiceLineGroupFilters.length > 0) {
      mappingWhere.SubServlineGroupCode = { in: subServiceLineGroupFilters };
    } else if (serviceLineFilters.length > 0) {
      mappingWhere.masterCode = { in: serviceLineFilters };
    }
    // else: no filter = fetch all (empty where clause)

    // Single query fetching all needed fields (instead of 2 separate queries)
    const allExternalMappings = await prisma.serviceLineExternal.findMany({
      where: mappingWhere,
      select: { ServLineCode: true, SubServlineGroupCode: true, SubServlineGroupDesc: true }
    });

    // Extract unique ServLineCodes
    externalServLineCodes = [...new Set(
      allExternalMappings.map(m => m.ServLineCode).filter((code): code is string => !!code)
    )];

    if (externalServLineCodes.length === 0) {
      const emptyResponse = { 
        tasks: [], 
        pagination: { page, limit, total: 0, totalPages: 0, hasMore: false } 
      };
      await cache.set(cacheKey, emptyResponse, 300);
      return NextResponse.json(successResponse(emptyResponse));
    }

    // Build lookup map from already-fetched data (no second query needed)
    const servLineCodeToGroup = new Map<string, { code: string; desc: string }>();
    allExternalMappings.forEach(m => {
      if (m.ServLineCode) {
        servLineCodeToGroup.set(m.ServLineCode, {
          code: m.SubServlineGroupCode || '',
          desc: m.SubServlineGroupDesc || ''
        });
      }
    });

    // Build task where conditions
    interface TaskWhereConditions {
      ServLineCode: { in: string[] };
      GSClientID: { not: null };
      Active: string;
      Client?: Record<string, unknown>;
      TaskCode?: { in: string[] };
      TaskManager?: { in: string[] };
    }
    const taskWhereConditions: TaskWhereConditions = {
      ServLineCode: { in: externalServLineCodes },
      GSClientID: { not: null },
      Active: 'Yes',
    };

    // Client filters
    const clientFilters: Record<string, unknown> = {};
    
    if (clientCodes.length > 0) {
      clientFilters.clientCode = { in: clientCodes };
    }
    
    if (groupDescs.length > 0) {
      clientFilters.groupDesc = { in: groupDescs };
    }
    
    if (partnerCodes.length > 0) {
      clientFilters.clientPartner = { in: partnerCodes };
    }

    if (Object.keys(clientFilters).length > 0) {
      taskWhereConditions.Client = clientFilters;
    }

    // Task-level filters
    if (taskCodes.length > 0) {
      taskWhereConditions.TaskCode = { in: taskCodes };
    }
    
    if (managerCodes.length > 0) {
      taskWhereConditions.TaskManager = { in: managerCodes };
    }

    // Pagination
    const offset = (page - 1) * limit;

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
          ServLineCode: true,
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
      prisma.task.count({ where: taskWhereConditions })
    ]);

    // Fetch TaskTeam data
    const taskIds = tasks.map(t => t.id);
    
    if (taskIds.length === 0) {
      const emptyResponse = { 
        tasks: [], 
        pagination: { page, limit, total: 0, totalPages: 0, hasMore: false } 
      };
      await cache.set(cacheKey, emptyResponse, 300);
      return NextResponse.json(successResponse(emptyResponse));
    }

    const taskTeamMembers = await prisma.taskTeam.findMany({
      where: { taskId: { in: taskIds } },
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
          select: { id: true, name: true, email: true, image: true }
        }
      }
    });

    // Get employee data
    const userIds = [...new Set(taskTeamMembers.map(member => member.userId))];
    const employeeMap = await mapUsersToEmployees(userIds);

    // Group TaskTeam by taskId
    const taskTeamMap = new Map<number, typeof taskTeamMembers>();
    taskTeamMembers.forEach(member => {
      if (!taskTeamMap.has(member.taskId)) {
        taskTeamMap.set(member.taskId, []);
      }
      taskTeamMap.get(member.taskId)!.push(member);
    });

    // Build task rows
    const taskRows = tasks
      .map(task => {
        if (!task.Client || !task.Client.GSClientID) return null;

        const teamMembers = taskTeamMap.get(task.id) || [];
        const servLineGroup = task.ServLineCode ? servLineCodeToGroup.get(task.ServLineCode) : null;

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
          serviceLine: task.ServLineCode || null,
          subServiceLineGroup: servLineGroup?.code || null,
          allocations
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => {
        const clientCompare = (a.clientName || '').localeCompare(b.clientName || '');
        if (clientCompare !== 0) return clientCompare;
        return (a.taskName || '').localeCompare(b.taskName || '');
      });

    const response = {
      tasks: taskRows,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: totalCount > (page * limit)
      }
    };

    await cache.set(cacheKey, response, 300);

    return NextResponse.json(successResponse(response));
  },
});
