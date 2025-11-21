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
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    
    // Only apply pagination if page or limit params are explicitly provided
    const usePagination = pageParam !== null || limitParam !== null;
    const page = parseInt(pageParam || '1');
    const limit = parseInt(limitParam || '20');
    const skip = usePagination ? (page - 1) * limit : undefined;
    const take = usePagination ? limit : undefined;

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { clientNameFull: { contains: search } },
        { clientCode: { contains: search } },
        { groupDesc: { contains: search } },
        { industry: { contains: search } },
      ];
    }

    // Get total count
    const total = await prisma.client.count({ where });

    // Get clients with project count - optimized field selection
    const clients = await prisma.client.findMany({
      where,
      skip,
      take,
      orderBy: { clientNameFull: 'asc' },
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
          limit: take || total,
          total,
          totalPages: usePagination ? Math.ceil(total / limit) : 1,
        },
      })
    );
  } catch (error) {
    return handleApiError(error, 'Get Clients');
  }
}

