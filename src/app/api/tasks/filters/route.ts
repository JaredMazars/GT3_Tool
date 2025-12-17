import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { getServLineCodesBySubGroup } from '@/lib/utils/serviceLineExternal';

/**
 * GET /api/tasks/filters
 * Fetch distinct filter option values for task filters
 * Returns clients, task names, partners, managers, and service lines for filter dropdowns
 * 
 * Performance optimizations:
 * - Redis caching (30min TTL for relatively static data)
 * - No pagination (returns all distinct values up to limit)
 * - Optional search parameters for server-side filtering
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check Permission
    const { checkFeature } = await import('@/lib/permissions/checkFeature');
    const { Feature } = await import('@/lib/permissions/features');
    
    const hasTaskPermission = await checkFeature(user.id, Feature.ACCESS_TASKS);
    
    if (!hasTaskPermission) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);

    // Get service line context
    const serviceLine = searchParams.get('serviceLine') || undefined;
    const subServiceLineGroup = searchParams.get('subServiceLineGroup') || undefined;

    // Get ServLineCodes for the specific sub-service line group (same logic as task list)
    let servLineCodes: string[] = [];
    if (subServiceLineGroup) {
      servLineCodes = await getServLineCodesBySubGroup(subServiceLineGroup, serviceLine);
      
      if (servLineCodes.length === 0) {
        // Return empty results if no ServLineCodes found for this sub-group
        return NextResponse.json(successResponse({
          clients: [],
          taskNames: [],
          partners: [],
          managers: [],
          serviceLines: [],
          metadata: {
            clients: { hasMore: false, total: 0, returned: 0 },
            taskNames: { hasMore: false, total: 0, returned: 0 },
            partners: { hasMore: false, total: 0, returned: 0 },
            managers: { hasMore: false, total: 0, returned: 0 },
            serviceLines: { hasMore: false, total: 0, returned: 0 },
          },
        }));
      }
    }

    const clientSearch = searchParams.get('clientSearch') || '';
    const taskNameSearch = searchParams.get('taskNameSearch') || '';
    const partnerSearch = searchParams.get('partnerSearch') || '';
    const managerSearch = searchParams.get('managerSearch') || '';

    // Enforce minimum search length (client-side should prevent this, but validate server-side)
    const clientTooShort = clientSearch.length > 0 && clientSearch.length < 2;
    const taskNameTooShort = taskNameSearch.length > 0 && taskNameSearch.length < 2;
    const partnerTooShort = partnerSearch.length > 0 && partnerSearch.length < 2;
    const managerTooShort = managerSearch.length > 0 && managerSearch.length < 2;

    if (clientTooShort || taskNameTooShort || partnerTooShort || managerTooShort) {
      return NextResponse.json(successResponse({
        clients: clientTooShort ? [] : undefined,
        taskNames: taskNameTooShort ? [] : undefined,
        partners: partnerTooShort ? [] : undefined,
        managers: managerTooShort ? [] : undefined,
        metadata: {
          clients: clientTooShort ? { hasMore: false, total: 0, returned: 0 } : undefined,
          taskNames: taskNameTooShort ? { hasMore: false, total: 0, returned: 0 } : undefined,
          partners: partnerTooShort ? { hasMore: false, total: 0, returned: 0 } : undefined,
          managers: managerTooShort ? { hasMore: false, total: 0, returned: 0 } : undefined,
        },
        message: 'Please enter at least 2 characters to search',
      }));
    }

    // Build cache key with service line context
    const cacheKey = `${CACHE_PREFIXES.ANALYTICS}task-filters:sl:${serviceLine}:subGroup:${subServiceLineGroup}:client:${clientSearch}:taskName:${taskNameSearch}:partner:${partnerSearch}:manager:${managerSearch}:user:${user.id}`;
    
    // Try cache first (30min TTL since filter options are relatively static)
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // Reduced limit for faster response times
    const FILTER_LIMIT = 50;

    // Base where clause for service line filtering (using ServLineCode field)
    const baseWhere = servLineCodes.length > 0 
      ? { ServLineCode: { in: servLineCodes } }
      : {};


    // Build where clauses for each filter type
    
    // For clients: Query Task table with Client relation for search
    const clientWhere: any = {
      ...baseWhere,
      GSClientID: { not: null },
    };
    
      if (clientSearch) {
      clientWhere.Client = {
        OR: [
          { clientCode: { contains: clientSearch } },
          { clientNameFull: { contains: clientSearch } },
        ],
      };
    }

    const taskNameWhere: any = {
      ...baseWhere,
      TaskDesc: { not: '' }, // Exclude empty strings
    };
    
    if (taskNameSearch) {
      taskNameWhere.TaskDesc = { contains: taskNameSearch };
    }

    // For partner/manager search: First get matching employee codes from Employee table
    let partnerEmployeeCodes: string[] = [];
    if (partnerSearch) {
      const matchingPartners = await prisma.employee.findMany({
        where: {
          Active: 'Yes',
          OR: [
            { EmpCode: { contains: partnerSearch } },
            { EmpName: { contains: partnerSearch } },
          ],
        },
        select: {
          EmpCode: true,
        },
        take: 100, // Reasonable limit for search matches
      });
      partnerEmployeeCodes = matchingPartners.map(e => e.EmpCode);
    }
    
    let managerEmployeeCodes: string[] = [];
    if (managerSearch) {
      const matchingManagers = await prisma.employee.findMany({
        where: {
          Active: 'Yes',
          OR: [
            { EmpCode: { contains: managerSearch } },
            { EmpName: { contains: managerSearch } },
          ],
        },
        select: {
          EmpCode: true,
        },
        take: 100, // Reasonable limit for search matches
      });
      managerEmployeeCodes = matchingManagers.map(e => e.EmpCode);
    }
    
    const partnerWhere: any = {
      ...baseWhere,
      TaskPartner: { not: '' }, // Exclude empty strings
    };
    
    if (partnerSearch && partnerEmployeeCodes.length > 0) {
      // Filter by matching employee codes
      partnerWhere.TaskPartner = { in: partnerEmployeeCodes };
    } else if (partnerSearch && partnerEmployeeCodes.length === 0) {
      // No employees matched search - return no results
      partnerWhere.TaskPartner = { in: ['__NO_MATCH__'] };
    }

    const managerWhere: any = {
      ...baseWhere,
      TaskManager: { not: '' }, // Exclude empty strings
    };
    
    if (managerSearch && managerEmployeeCodes.length > 0) {
      // Filter by matching employee codes
      managerWhere.TaskManager = { in: managerEmployeeCodes };
    } else if (managerSearch && managerEmployeeCodes.length === 0) {
      // No employees matched search - return no results
      managerWhere.TaskManager = { in: ['__NO_MATCH__'] };
    }

    // Execute queries in parallel for better performance
    const [
      clientsData,
      taskNamesData,
      partnersData,
      managersData,
      clientsTotal,
      taskNamesTotal,
      partnersTotal,
      managersTotal
    ] = await Promise.all([
      // Get distinct clients - query Task table (only clients with tasks)
      prisma.task.findMany({
        where: clientWhere,
        select: {
          GSClientID: true,
          Client: {
            select: {
              id: true,
              clientCode: true,
              clientNameFull: true,
            },
          },
        },
        distinct: ['GSClientID'],
        orderBy: {
          Client: {
            clientCode: 'asc',
          },
        },
        take: FILTER_LIMIT,
      }),
      
      // Get distinct task names
      prisma.task.groupBy({
        by: ['TaskDesc'],
        where: taskNameWhere,
        orderBy: {
          TaskDesc: 'asc',
        },
        take: FILTER_LIMIT,
      }),
      
      // Get distinct partners
      prisma.task.findMany({
        where: partnerWhere,
        select: {
          TaskPartner: true,
          TaskPartnerName: true,
        },
        distinct: ['TaskPartner'],
        orderBy: {
          TaskPartnerName: 'asc',
        },
        take: FILTER_LIMIT,
      }),
      
      // Get distinct managers
      prisma.task.findMany({
        where: managerWhere,
        select: {
          TaskManager: true,
          TaskManagerName: true,
        },
        distinct: ['TaskManager'],
        orderBy: {
          TaskManagerName: 'asc',
        },
        take: FILTER_LIMIT,
      }),

      // Total counts for metadata - count distinct clients in tasks
      prisma.task.groupBy({
        by: ['GSClientID'],
        where: clientWhere, // Use clientWhere to match the main query filtering
      }),

      prisma.task.groupBy({
        by: ['TaskDesc'],
        where: { ...baseWhere, TaskDesc: { not: '' } },
      }),

      prisma.task.groupBy({
        by: ['TaskPartner'],
        where: { ...baseWhere, TaskPartner: { not: '' } },
      }),

      prisma.task.groupBy({
        by: ['TaskManager'],
        where: { ...baseWhere, TaskManager: { not: '' } },
      }),
    ]);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fefc3511-fdd0-43c4-a837-f5a8973894e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'filters/route.ts:post-query',message:'Query results summary',data:{clientsDataCount:clientsData.length,clientsTotalCount:clientsTotal.length,taskNamesCount:taskNamesData.length,partnersTotalCount:partnersTotal.length,managersTotalCount:managersTotal.length,clientWhere:JSON.stringify(clientWhere),baseWhere:JSON.stringify(baseWhere),searches:{client:clientSearch,taskName:taskNameSearch,partner:partnerSearch,manager:managerSearch}},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H'})}).catch(()=>{});
    // #endregion

    // FIX: Both TaskPartnerName and TaskManagerName have wrong values in database
    // Lookup correct names from Employee table
    const uniquePartnerCodes = [...new Set(partnersData.map(t => t.TaskPartner).filter(Boolean))];
    const uniqueManagerCodes = [...new Set(managersData.map(t => t.TaskManager).filter(Boolean))];
    const allEmployeeCodes = [...new Set([...uniquePartnerCodes, ...uniqueManagerCodes])];
    
    const employees = allEmployeeCodes.length > 0 ? await prisma.employee.findMany({
      where: {
        EmpCode: { in: allEmployeeCodes },
        Active: 'Yes',
      },
      select: {
        EmpCode: true,
        EmpName: true,
      },
    }) : [];
    
    // Create lookup map
    const employeeNameMap = new Map(
      employees.map(emp => [emp.EmpCode, emp.EmpName])
    );

    // Format the response
    const clients = clientsData
      .filter(task => task.Client !== null)
      .map(task => ({
        id: task.Client!.id,
        code: task.Client!.clientCode || '',
        name: task.Client!.clientNameFull || task.Client!.clientCode || 'Unknown',
      }));

    const taskNames = taskNamesData
      .map(item => item.TaskDesc)
      .filter((name): name is string => !!name);

    const partners = partnersData
      .filter(task => task.TaskPartner !== null)
      .map(task => ({
        id: task.TaskPartner!,
        name: employeeNameMap.get(task.TaskPartner!) || task.TaskPartnerName || task.TaskPartner!,
      }));

    const managers = managersData
      .filter(task => task.TaskManager !== null)
      .map(task => ({
        id: task.TaskManager!,
        name: employeeNameMap.get(task.TaskManager!) || task.TaskManagerName || task.TaskManager!,
      }));

    const responseData = {
      clients,
      taskNames,
      partners,
      managers,
      metadata: {
        clients: {
          hasMore: clientsTotal.length > FILTER_LIMIT,
          total: clientsTotal.length,
          returned: clients.length,
        },
        taskNames: {
          hasMore: taskNamesTotal.length > FILTER_LIMIT,
          total: taskNamesTotal.length,
          returned: taskNames.length,
        },
        partners: {
          hasMore: partnersTotal.length > FILTER_LIMIT,
          total: partnersTotal.length,
          returned: partners.length,
        },
        managers: {
          hasMore: managersTotal.length > FILTER_LIMIT,
          total: managersTotal.length,
          returned: managers.length,
        },
      },
    };

    // Cache the response (30min TTL)
    await cache.set(cacheKey, responseData, 1800);

    return NextResponse.json(successResponse(responseData));
  } catch (error) {
    return handleApiError(error, 'Get Task Filters');
  }
}
