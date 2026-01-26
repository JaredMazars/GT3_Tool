export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { successResponse } from '@/lib/utils/apiUtils';
import { performanceMonitor } from '@/lib/utils/performanceMonitor';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { getUserSubServiceLineGroups } from '@/lib/services/service-lines/serviceLineService';
import { secureRoute } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { getClientsWithPagination } from '@/lib/services/clients/clientService';

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
    
    // Get advanced filters from query params
    const clientCodes = searchParams.getAll('clientCodes[]');
    const partners = searchParams.getAll('partners[]');
    const managers = searchParams.getAll('managers[]');
    const groups = searchParams.getAll('groups[]');
    
    // Delegate to service layer
    const result = await getClientsWithPagination({
      search,
      page,
      limit,
      sortBy,
      sortOrder,
      clientCodes,
      partners,
      managers,
      groups,
    });

    performanceMonitor.trackApiCall('/api/clients', startTime, false);

    return NextResponse.json(successResponse(result));
  },
});
