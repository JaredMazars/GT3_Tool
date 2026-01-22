export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { enrichRecordsWithEmployeeNames } from '@/lib/services/employees/employeeQueries';
import { enrichEmployeesWithStatus } from '@/lib/services/employees/employeeStatusService';
import { performanceMonitor } from '@/lib/utils/performanceMonitor';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { getUserSubServiceLineGroups } from '@/lib/services/service-lines/serviceLineService';
import { secureRoute } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

// Zod schema for query params validation
const ClientListQuerySchema = z.object({
  search: z.string().max(100).optional().default(''),
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  sortBy: z.enum(['clientNameFull', 'clientCode', 'groupDesc', 'createdAt', 'updatedAt']).optional().default('clientNameFull'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
}).strict();

/**
 * GET /api/clients
 * List clients with pagination and filtering
 */
export const GET = secureRoute.query({
  handler: async (request, { user }) => {
    const startTime = Date.now();

    // Check permission
    const hasPagePermission = await checkFeature(user.id, Feature.ACCESS_CLIENTS);
    const userSubGroups = await getUserSubServiceLineGroups(user.id);
    const hasServiceLineAccess = userSubGroups.length > 0;
    
    if (!hasPagePermission && !hasServiceLineAccess) {
      throw new AppError(403, 'Forbidden - Insufficient permissions', ErrorCodes.FORBIDDEN);
    }
    
    const { searchParams } = new URL(request.url);
    
    // Validate query params
    const queryResult = ClientListQuerySchema.safeParse({
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    });
    
    if (!queryResult.success) {
      throw new AppError(400, 'Invalid query parameters', ErrorCodes.VALIDATION_ERROR, { errors: queryResult.error.flatten() });
    }
    
    const { search, page, limit, sortBy, sortOrder } = queryResult.data;
    const clientCodes = searchParams.getAll('clientCodes[]');
    const partners = searchParams.getAll('partners[]');
    const managers = searchParams.getAll('managers[]');
    const groups = searchParams.getAll('groups[]');
    
    const skip = (page - 1) * limit;

    interface WhereClause {
      OR?: Array<Record<string, { contains: string }>>;
      AND?: Array<{ [key: string]: unknown }>;
    }
    const where: WhereClause = {};
    
    const andConditions: Array<{ [key: string]: unknown }> = [];
    
    if (clientCodes.length > 0) {
      andConditions.push({ clientCode: { in: clientCodes } });
    }
    
    if (partners.length > 0) {
      andConditions.push({ clientPartner: { in: partners } });
    }
    
    if (managers.length > 0) {
      andConditions.push({ clientManager: { in: managers } });
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

    // Build orderBy with deterministic secondary sort for pagination stability
    const orderBy: Array<Record<string, 'asc' | 'desc'>> = [
      { [sortBy]: sortOrder },
      { GSClientID: 'asc' }, // Secondary sort for deterministic ordering
    ];

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

    // Fetch employee status for all client partners, managers, and in-charges
    const allEmployeeCodes = [...new Set(
      enrichedClients.flatMap(c => [c.clientPartner, c.clientManager, c.clientIncharge]).filter(Boolean) as string[]
    )];
    const employeeStatusMap = await enrichEmployeesWithStatus(allEmployeeCodes);

    // Add status to each client
    const enrichedClientsWithStatus = enrichedClients.map(client => ({
      ...client,
      clientPartnerStatus: client.clientPartner ? employeeStatusMap.get(client.clientPartner) : undefined,
      clientManagerStatus: client.clientManager ? employeeStatusMap.get(client.clientManager) : undefined,
      clientInchargeStatus: client.clientIncharge ? employeeStatusMap.get(client.clientIncharge) : undefined,
    }));

    const responseData = {
      clients: enrichedClientsWithStatus,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };

    performanceMonitor.trackApiCall('/api/clients', startTime, false);

    return NextResponse.json(successResponse(responseData));
  },
});
