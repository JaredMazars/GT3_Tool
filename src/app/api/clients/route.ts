import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const { checkUserPermission } = await import('@/lib/services/permissions/permissionService');
    const hasPermission = await checkUserPermission(user.id, 'clients', 'READ');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100 per page
    const sortBy = searchParams.get('sortBy') || 'clientNameFull';
    const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';
    
    const skip = (page - 1) * limit;

    // Build where clause with improved search
    interface WhereClause {
      OR?: Array<Record<string, { contains: string }>>;
    }
    const where: WhereClause = {};
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

    // Get clients with project count - optimized field selection
    const clients = await prisma.client.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        clientCode: true,
        clientNameFull: true,
        groupCode: true,
        groupDesc: true,
        clientPartner: true,
        clientManager: true,
        clientIncharge: true,
        industry: true,
        sector: true,
        active: true,
        typeCode: true,
        typeDesc: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            Project: true,
          },
        },
      },
    });

    return NextResponse.json(
      successResponse({
        clients,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    );
  } catch (error) {
    return handleApiError(error, 'Get Clients');
  }
}

