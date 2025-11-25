/**
 * BD Opportunities API Routes
 * GET /api/bd/opportunities - List opportunities with filters
 * POST /api/bd/opportunities - Create new opportunity
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import {
  CreateBDOpportunitySchema,
  BDOpportunityFiltersSchema,
} from '@/lib/validation/schemas';
import { getOpportunities, createOpportunity } from '@/lib/services/bd/opportunityService';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const filters = BDOpportunityFiltersSchema.parse({
      serviceLine: searchParams.get('serviceLine') || undefined,
      stageId: searchParams.get('stageId') ? parseInt(searchParams.get('stageId')!) : undefined,
      status: searchParams.get('status') || undefined,
      assignedTo: searchParams.get('assignedTo') || undefined,
      search: searchParams.get('search') || undefined,
      fromDate: searchParams.get('fromDate')
        ? new Date(searchParams.get('fromDate')!)
        : undefined,
      toDate: searchParams.get('toDate') ? new Date(searchParams.get('toDate')!) : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 20,
    });

    const result = await getOpportunities(filters);

    return NextResponse.json(
      successResponse({
        opportunities: result.opportunities,
        total: result.total,
        page: filters.page,
        pageSize: filters.pageSize,
        totalPages: Math.ceil(result.total / filters.pageSize),
      })
    );
  } catch (error) {
    return handleApiError(error, 'GET /api/bd/opportunities');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = CreateBDOpportunitySchema.parse(body);

    // Default assignedTo to current user if not provided
    const assignedTo = validated.assignedTo || user.id;

    const opportunity = await createOpportunity({
      ...validated,
      assignedTo,
      createdBy: user.id,
    });

    return NextResponse.json(successResponse(opportunity), { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/bd/opportunities');
  }
}

