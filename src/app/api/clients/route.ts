import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCachedList, setCachedList } from '@/lib/services/cache/listCache';
import { enrichRecordsWithEmployeeNames } from '@/lib/services/employees/employeeQueries';
import { performanceMonitor } from '@/lib/utils/performanceMonitor';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { getUserSubServiceLineGroups } from '@/lib/services/service-lines/serviceLineService';
import { secureRoute } from '@/lib/api/secureRoute';

/**
 * GET /api/clients
 * List clients with pagination and filtering
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const startTime = Date.now();
    let cacheHit = false;

    // Check permission
    const hasPagePermission = await checkFeature(user.id, Feature.ACCESS_CLIENTS);
    const userSubGroups = await getUserSubServiceLineGroups(user.id);
    const hasServiceLineAccess = userSubGroups.length > 0;
    
    if (!hasPagePermission && !hasServiceLineAccess) {
      return NextResponse.json({ success: false, error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Math.min(Number.parseInt(searchParams.get('limit') || '50'), 100);
    const sortBy = searchParams.get('sortBy') || 'clientNameFull';
    const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';
    const clientCodes = searchParams.getAll('clientCodes[]');
    const industries = searchParams.getAll('industries[]');
    const groups = searchParams.getAll('groups[]');
    
    const skip = (page - 1) * limit;

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

    interface WhereClause {
      OR?: Array<Record<string, { contains: string }>>;
      AND?: Array<{ [key: string]: unknown }>;
    }
    const where: WhereClause = {};
    
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

    type OrderByClause = Record<string, 'asc' | 'desc'>;
    const orderBy: OrderByClause = {};
    const validSortFields = ['clientNameFull', 'clientCode', 'groupDesc', 'createdAt', 'updatedAt'] as const;
    if (validSortFields.includes(sortBy as typeof validSortFields[number])) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.clientNameFull = 'asc';
    }

    const total = await prisma.client.count({ where });

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

    const clientGSIDs = clients.map(c => c.GSClientID);
    const taskCounts = await prisma.task.groupBy({
      by: ['GSClientID'],
      where: { GSClientID: { in: clientGSIDs }, Active: 'Yes' },
      _count: { id: true },
    });

    const taskCountMap = new Map<string, number>();
    for (const count of taskCounts) {
      if (count.GSClientID) {
        taskCountMap.set(count.GSClientID, count._count.id);
      }
    }

    const clientsWithCounts = clients.map(client => ({
      ...client,
      _count: { Task: taskCountMap.get(client.GSClientID) || 0 },
    }));

    const enrichedClients = await enrichRecordsWithEmployeeNames(clientsWithCounts, [
      { codeField: 'clientPartner', nameField: 'clientPartnerName' },
      { codeField: 'clientManager', nameField: 'clientManagerName' },
      { codeField: 'clientIncharge', nameField: 'clientInchargeName' },
    ]);

    const responseData = {
      clients: enrichedClients,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };

    if (!hasFilters) {
      await setCachedList(cacheParams, responseData);
    }

    performanceMonitor.trackApiCall('/api/clients', startTime, cacheHit);

    return NextResponse.json(successResponse(responseData));
  },
});
