export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { performanceMonitor } from '@/lib/utils/performanceMonitor';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { getUserSubServiceLineGroups } from '@/lib/services/service-lines/serviceLineService';
import { secureRoute } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

// Zod schema for query params validation
const ClientFiltersQuerySchema = z.object({
  partnerSearch: z.string().max(100).optional().default(''),
  managerSearch: z.string().max(100).optional().default(''),
  groupSearch: z.string().max(100).optional().default(''),
}).strict();

/**
 * GET /api/clients/filters
 * Fetch distinct filter option values for client filters
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const startTime = Date.now();

    // Check Permission
    const hasPagePermission = await checkFeature(user.id, Feature.ACCESS_CLIENTS);
    const userSubGroups = await getUserSubServiceLineGroups(user.id);
    const hasServiceLineAccess = userSubGroups.length > 0;
    
    if (!hasPagePermission && !hasServiceLineAccess) {
      throw new AppError(403, 'Forbidden - Insufficient permissions', ErrorCodes.FORBIDDEN);
    }

    const { searchParams } = new URL(request.url);
    
    // Validate query params
    const queryResult = ClientFiltersQuerySchema.safeParse({
      partnerSearch: searchParams.get('partnerSearch') || undefined,
      managerSearch: searchParams.get('managerSearch') || undefined,
      groupSearch: searchParams.get('groupSearch') || undefined,
    });
    
    if (!queryResult.success) {
      throw new AppError(400, 'Invalid query parameters', ErrorCodes.VALIDATION_ERROR, { errors: queryResult.error.flatten() });
    }
    
    const { partnerSearch, managerSearch, groupSearch } = queryResult.data;

    const partnerTooShort = partnerSearch.length > 0 && partnerSearch.length < 2;
    const managerTooShort = managerSearch.length > 0 && managerSearch.length < 2;
    const groupTooShort = groupSearch.length > 0 && groupSearch.length < 2;

    if (partnerTooShort || managerTooShort || groupTooShort) {
      return NextResponse.json(successResponse({
        partners: partnerTooShort ? [] : undefined,
        managers: managerTooShort ? [] : undefined,
        groups: groupTooShort ? [] : undefined,
        metadata: {
          partners: partnerTooShort ? { hasMore: false, total: 0, returned: 0 } : undefined,
          managers: managerTooShort ? { hasMore: false, total: 0, returned: 0 } : undefined,
          groups: groupTooShort ? { hasMore: false, total: 0, returned: 0 } : undefined,
        },
        message: 'Please enter at least 2 characters to search',
      }));
    }

    const partnerWhere: Record<string, unknown> = {};
    const managerWhere: Record<string, unknown> = {};
    const groupWhere: Record<string, unknown> = {};

    if (partnerSearch) {
      partnerWhere.OR = [
        { EmpCode: { contains: partnerSearch } },
        { EmpName: { contains: partnerSearch } },
      ];
    }

    if (managerSearch) {
      managerWhere.OR = [
        { EmpCode: { contains: managerSearch } },
        { EmpName: { contains: managerSearch } },
      ];
    }

    if (groupSearch) {
      groupWhere.OR = [
        { groupDesc: { contains: groupSearch } },
        { groupCode: { contains: groupSearch } },
      ];
    }

    const FILTER_LIMIT = 30;
    
    const [partnersData, managersData, groupsData] = await Promise.all([
      prisma.employee.findMany({
        where: partnerWhere,
        select: {
          EmpCode: true,
          EmpName: true,
        },
        orderBy: { EmpName: 'asc' },
        take: FILTER_LIMIT,
        distinct: ['EmpCode'],
      }),
      prisma.employee.findMany({
        where: managerWhere,
        select: {
          EmpCode: true,
          EmpName: true,
        },
        orderBy: { EmpName: 'asc' },
        take: FILTER_LIMIT,
        distinct: ['EmpCode'],
      }),
      prisma.client.groupBy({
        by: ['groupCode', 'groupDesc'],
        where: groupWhere,
        orderBy: { groupDesc: 'asc' },
        take: FILTER_LIMIT,
      }),
    ]);

    const partners = partnersData.map(emp => ({ 
      code: emp.EmpCode, 
      name: emp.EmpName 
    }));

    const managers = managersData.map(emp => ({ 
      code: emp.EmpCode, 
      name: emp.EmpName 
    }));

    const groups = groupsData
      .filter(group => group.groupCode !== null && group.groupDesc !== null)
      .map(group => ({ code: group.groupCode!, name: group.groupDesc! }));

    const responseData = {
      partners,
      managers,
      groups,
      metadata: {
        partners: { hasMore: partners.length >= FILTER_LIMIT, total: partners.length, returned: partners.length },
        managers: { hasMore: managers.length >= FILTER_LIMIT, total: managers.length, returned: managers.length },
        groups: { hasMore: groups.length >= FILTER_LIMIT, total: groups.length, returned: groups.length },
      },
    };

    performanceMonitor.trackApiCall('/api/clients/filters', startTime, false);

    return NextResponse.json(successResponse(responseData));
  },
});
