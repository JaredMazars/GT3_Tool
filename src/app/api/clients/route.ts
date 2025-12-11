import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { getServLineCodesBySubGroup } from '@/lib/utils/serviceLineExternal';
import { getCachedList, setCachedList } from '@/lib/services/cache/listCache';
import { enrichRecordsWithEmployeeNames } from '@/lib/services/employees/employeeQueries';

export async function GET(request: NextRequest) {
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
    
    const skip = (page - 1) * limit;

    // Try to get cached data
    const cacheParams = {
      endpoint: 'clients' as const,
      page,
      limit,
      serviceLine,
      subServiceLineGroup,
      search,
      sortBy,
      sortOrder,
    };
    
    const cached = await getCachedList(cacheParams);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // Build where clause with improved search
    interface WhereClause {
      OR?: Array<Record<string, { contains: string }>>;
      Task?: {
        some: {
          ServLineCode: {
            in: string[];
          };
        };
      };
    }
    const where: WhereClause = {};
    
    // Filter by SubServiceLineGroup via Task relationships ONLY if explicitly requested
    if (subServiceLineGroup) {
      const servLineCodes = await getServLineCodesBySubGroup(
        subServiceLineGroup,
        serviceLine || undefined
      );
      
      if (servLineCodes.length > 0) {
        where.Task = {
          some: {
            ServLineCode: { in: servLineCodes },
          },
        };
      } else {
        // No ServLineCodes found, return empty result
        return NextResponse.json(
          successResponse({
            clients: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
            },
          })
        );
      }
    }
    // If no subServiceLineGroup filter, show ALL clients organization-wide
    
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

    // Get clients with task counts - optimized field selection for list view
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
        groupDesc: true,
        clientPartner: true,
        clientManager: true,
        clientIncharge: true,
        industry: true,
        sector: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            Task: true,
          },
        },
      },
    });

    // Enrich clients with employee names
    const enrichedClients = await enrichRecordsWithEmployeeNames(clients, [
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

    // Cache the response
    await setCachedList(cacheParams, responseData);

    return NextResponse.json(successResponse(responseData));
  } catch (error) {
    return handleApiError(error, 'Get Clients');
  }
}


