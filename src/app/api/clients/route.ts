import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { getCachedList, setCachedList } from '@/lib/services/cache/listCache';
import { enrichRecordsWithEmployeeNames } from '@/lib/services/employees/employeeQueries';
import { performanceMonitor } from '@/lib/utils/performanceMonitor';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let cacheHit = false;
  
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    // Users with service line assignments automatically have client read access
    const { checkFeature } = await import('@/lib/permissions/checkFeature');
    const { Feature } = await import('@/lib/permissions/features');
    const { getUserSubServiceLineGroups } = await import('@/lib/services/service-lines/serviceLineService');
    
    const hasPagePermission = await checkFeature(user.id, Feature.ACCESS_CLIENTS);
    const userSubGroups = await getUserSubServiceLineGroups(user.id);
    const hasServiceLineAccess = userSubGroups.length > 0;
    
    // Grant access if user has either page permission OR service line assignment
    if (!hasPagePermission && !hasServiceLineAccess) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Math.min(Number.parseInt(searchParams.get('limit') || '50'), 100); // Max 100 per page
    const sortBy = searchParams.get('sortBy') || 'clientNameFull';
    const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';
    const subServiceLineGroup = searchParams.get('subServiceLineGroup') || undefined;
    const serviceLine = searchParams.get('serviceLine') || undefined;
    const clientCodes = searchParams.getAll('clientCodes[]'); // Array of client codes to filter by
    const industries = searchParams.getAll('industries[]'); // Array of industries to filter by
    const groups = searchParams.getAll('groups[]'); // Array of group codes to filter by
    
    const skip = (page - 1) * limit;

    // Try to get cached data
    // NOTE: serviceLine and subServiceLineGroup are NOT included in cache key
    // because we now show ALL clients regardless of service line
    // Skip cache when filters are applied (too many filter combinations to cache)
    const hasFilters = clientCodes.length > 0 || industries.length > 0 || groups.length > 0;
    
    const cacheParams = {
      endpoint: 'clients' as const,
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    };
    
    if (!hasFilters) {
      const cached = await getCachedList(cacheParams);
      if (cached) {
        cacheHit = true;
        performanceMonitor.trackApiCall('/api/clients', startTime, true);
        return NextResponse.json(successResponse(cached));
      }
    }

    // Build where clause with improved search
    // Note: subServiceLineGroup and serviceLine params kept for backward compatibility
    // but are not used for filtering - all clients are shown organization-wide
    interface WhereClause {
      OR?: Array<Record<string, { contains: string }>>;
      clientCode?: { in: string[] };
      industry?: { in: string[] };
      groupCode?: { in: string[] };
      AND?: Array<{ [key: string]: unknown }>;
    }
    const where: WhereClause = {};
    
    // Apply array filters (from filter dropdowns)
    const andConditions: Array<{ [key: string]: unknown }> = [];
    
    if (clientCodes.length > 0) {
      andConditions.push({ clientCode: { in: clientCodes } });
    }
    
    if (industries.length > 0) {
      andConditions.push({ industry: { in: industries } });
    }
    
    if (groups.length > 0) {
      andConditions.push({ groupCode: { in: groups } });
    }
    
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }
    
    // Apply search filter (text search)
    if (search) {
      where.OR = [
        { clientNameFull: { contains: search } },
        { clientCode: { contains: search } },
        { groupDesc: { contains: search } },
        { groupCode: { contains: search } },
        { industry: { contains: search } },
        { sector: { contains: search } },
      ];
    }

    // Build orderBy clause
    type OrderByClause = Record<string, 'asc' | 'desc'>;
    const orderBy: OrderByClause = {};
    const validSortFields = ['clientNameFull', 'clientCode', 'groupDesc', 'createdAt', 'updatedAt'] as const;
    if (validSortFields.includes(sortBy as typeof validSortFields[number])) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.clientNameFull = 'asc';
    }

    // Get total count
    const total = await prisma.client.count({ where });

    // Get clients - optimized field selection for list view
    // Only select fields actually displayed in the UI to minimize data transfer
    const clients = await prisma.client.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        GSClientID: true,
        clientCode: true,
        clientNameFull: true,
        groupCode: true,
        groupDesc: true,
        clientPartner: true,
        clientManager: true,
        clientIncharge: true,
        industry: true,
        sector: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Get active task counts for these clients (single optimized query)
    const clientGSIDs = clients.map(c => c.GSClientID);
    const taskCounts = await prisma.task.groupBy({
      by: ['GSClientID'],
      where: {
        GSClientID: { in: clientGSIDs },
        Active: 'Yes',
      },
      _count: {
        id: true,
      },
    });

    // Create a map of GSClientID -> task count
    const taskCountMap = new Map<string, number>();
    for (const count of taskCounts) {
      if (count.GSClientID) {
        taskCountMap.set(count.GSClientID, count._count.id);
      }
    }

    // Add task counts to clients
    const clientsWithCounts = clients.map(client => ({
      ...client,
      _count: {
        Task: taskCountMap.get(client.GSClientID) || 0,
      },
    }));

    // Enrich clients with employee names
    const enrichedClients = await enrichRecordsWithEmployeeNames(clientsWithCounts, [
      { codeField: 'clientPartner', nameField: 'clientPartnerName' },
      { codeField: 'clientManager', nameField: 'clientManagerName' },
      { codeField: 'clientIncharge', nameField: 'clientInchargeName' },
    ]);

    const responseData = {
      clients: enrichedClients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache the response (skip if filters are active)
    if (!hasFilters) {
      await setCachedList(cacheParams, responseData);
    }

    // Track performance
    performanceMonitor.trackApiCall('/api/clients', startTime, cacheHit);

    return NextResponse.json(successResponse(responseData));
  } catch (error) {
    performanceMonitor.trackApiCall('/api/clients [ERROR]', startTime, cacheHit);
    return handleApiError(error, 'Get Clients');
  }
}


