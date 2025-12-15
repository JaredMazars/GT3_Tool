import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { getUserServiceLines } from '@/lib/services/service-lines/serviceLineService';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError, AppError } from '@/lib/utils/errorHandler';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';

/**
 * GET /api/service-lines/[serviceLine]/[subServiceLineGroup]/planner/clients/filters
 * Fetch unique filter option values for client planner filters
 * Returns distinct values for clients, groups, partners, tasks, and managers
 * 
 * Performance optimizations:
 * - Redis caching (30min TTL for relatively static data)
 * - Optimized queries with Promise.all batching
 * - Only fetch active tasks with clients
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
      return handleApiError(new AppError(401, 'Unauthorized'), 'Get client planner filters');
    }

    // 2. Extract and validate params
    const subServiceLineGroup = params.subServiceLineGroup;
    if (!subServiceLineGroup) {
      return handleApiError(new AppError(400, 'Sub-service line group is required'), 'Get client planner filters');
    }

    // 3. Check user has access to this sub-service line group
    const userServiceLines = await getUserServiceLines(user.id);
    const hasAccess = userServiceLines.some(sl => 
      sl.subGroups?.some((sg: any) => sg.code === subServiceLineGroup)
    );
    if (!hasAccess) {
      return handleApiError(
        new AppError(403, 'You do not have access to this sub-service line group'),
        'Get client planner filters'
      );
    }

    // 4. Build cache key
    const cacheKey = `${CACHE_PREFIXES.TASK}planner:filters:${params.serviceLine}:${subServiceLineGroup}:user:${user.id}`;
    
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
        clients: [],
        groups: [],
        partners: [],
        tasks: [],
        managers: []
      };
      await cache.set(cacheKey, emptyResponse, 1800); // 30 min
      return NextResponse.json(successResponse(emptyResponse));
    }

    // 6. Fetch distinct filter values in parallel
    const queryStart = Date.now();
    
    // Fetch all tasks with clients for this sub-service line group
    const tasksWithClients = await prisma.task.findMany({
      where: {
        ServLineCode: { in: externalServLineCodes },
        GSClientID: { not: null },
        Active: 'Yes'
      },
      select: {
        TaskCode: true,
        TaskDesc: true,
        TaskManager: true,
        TaskManagerName: true,
        TaskPartner: true,
        TaskPartnerName: true,
        Client: {
          select: {
            clientCode: true,
            clientNameFull: true,
            groupDesc: true,
            clientPartner: true
          }
        }
      }
    });

    // 7. Extract unique values
    const clientsSet = new Map<string, string>();
    const groupsSet = new Set<string>();
    const partnersSet = new Map<string, string>();
    const tasksSet = new Map<string, string>();
    const managersSet = new Map<string, string>();

    tasksWithClients.forEach(task => {
      // Clients (use code as ID, show "Code - Name")
      if (task.Client?.clientCode) {
        const label = task.Client.clientNameFull 
          ? `${task.Client.clientCode} - ${task.Client.clientNameFull}`
          : task.Client.clientCode;
        clientsSet.set(task.Client.clientCode, label);
      }

      // Groups (use description as both ID and label)
      if (task.Client?.groupDesc) {
        groupsSet.add(task.Client.groupDesc);
      }

      // Partners (use code as ID, show "Code - Name")
      if (task.Client?.clientPartner) {
        const partnerCode = task.Client.clientPartner;
        if (!partnersSet.has(partnerCode)) {
          partnersSet.set(partnerCode, partnerCode);
        }
      }

      // Tasks (use code as ID, show "Code - Description")
      if (task.TaskCode) {
        const label = task.TaskDesc 
          ? `${task.TaskCode} - ${task.TaskDesc}`
          : task.TaskCode;
        tasksSet.set(task.TaskCode, label);
      }

      // Managers (use code as ID, show "Code - Name")
      if (task.TaskManager) {
        const label = task.TaskManagerName 
          ? `${task.TaskManager} - ${task.TaskManagerName}`
          : task.TaskManager;
        managersSet.set(task.TaskManager, label);
      }
    });

    // 8. Convert to sorted arrays
    const response = {
      clients: Array.from(clientsSet.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      
      groups: Array.from(groupsSet)
        .map(group => ({ id: group, label: group }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      
      partners: Array.from(partnersSet.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      
      tasks: Array.from(tasksSet.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      
      managers: Array.from(managersSet.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label))
    };

    // Cache for 30 minutes
    await cache.set(cacheKey, response, 1800);

    return NextResponse.json(successResponse(response));
  } catch (error) {
    return handleApiError(error, 'Get client planner filters');
  }
}


