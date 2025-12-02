/**
 * BD Activities API Routes
 * GET /api/bd/activities - List activities with filters
 * POST /api/bd/activities - Create new activity
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import {
  CreateBDActivitySchema,
  BDActivityFiltersSchema,
} from '@/lib/validation/schemas';
import { getActivities, createActivity } from '@/lib/services/bd/activityService';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const filters = BDActivityFiltersSchema.parse({
      opportunityId: searchParams.get('opportunityId')
        ? parseInt(searchParams.get('opportunityId')!)
        : undefined,
      activityType: searchParams.get('activityType') || undefined,
      status: searchParams.get('status') || undefined,
      assignedTo: searchParams.get('assignedTo') || undefined,
      fromDate: searchParams.get('fromDate')
        ? new Date(searchParams.get('fromDate')!)
        : undefined,
      toDate: searchParams.get('toDate') ? new Date(searchParams.get('toDate')!) : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 20,
    });

    const result = await getActivities(filters);

    return NextResponse.json(
      successResponse({
        activities: result.activities,
        total: result.total,
        page: filters.page,
        pageSize: filters.pageSize,
        totalPages: Math.ceil(result.total / filters.pageSize),
      })
    );
  } catch (error) {
    return handleApiError(error, 'GET /api/bd/activities');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = CreateBDActivitySchema.parse(body);

    // Default assignedTo to current user if not provided
    const assignedTo = validated.assignedTo || user.id;

    const activity = await createActivity({
      ...validated,
      assignedTo,
      createdBy: user.id,
    });

    return NextResponse.json(successResponse(activity), { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/bd/activities');
  }
}

