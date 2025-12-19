/**
 * BD Activities API Routes
 * GET /api/bd/activities - List activities with filters
 * POST /api/bd/activities - Create new activity
 */

import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import {
  CreateBDActivitySchema,
  BDActivityFiltersSchema,
} from '@/lib/validation/schemas';
import { getActivities, createActivity } from '@/lib/services/bd/activityService';

/**
 * GET /api/bd/activities
 * List activities with filters
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_BD,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);

    const filters = BDActivityFiltersSchema.parse({
      opportunityId: searchParams.get('opportunityId')
        ? Number.parseInt(searchParams.get('opportunityId')!)
        : undefined,
      activityType: searchParams.get('activityType') || undefined,
      status: searchParams.get('status') || undefined,
      assignedTo: searchParams.get('assignedTo') || undefined,
      fromDate: searchParams.get('fromDate') ? new Date(searchParams.get('fromDate')!) : undefined,
      toDate: searchParams.get('toDate') ? new Date(searchParams.get('toDate')!) : undefined,
      page: searchParams.get('page') ? Number.parseInt(searchParams.get('page')!) : 1,
      pageSize: searchParams.get('pageSize') ? Number.parseInt(searchParams.get('pageSize')!) : 20,
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
  },
});

/**
 * POST /api/bd/activities
 * Create new activity
 */
export const POST = secureRoute.mutation({
  feature: Feature.ACCESS_BD,
  schema: CreateBDActivitySchema,
  handler: async (request, { user, data }) => {
    const activity = await createActivity({
      opportunityId: data.opportunityId,
      contactId: data.contactId,
      activityType: data.activityType,
      subject: data.subject,
      description: data.description,
      status: data.status,
      dueDate: data.dueDate,
      duration: data.duration,
      location: data.location,
      assignedTo: data.assignedTo || user.id,
      createdBy: user.id,
    });

    return NextResponse.json(successResponse(activity), { status: 201 });
  },
});
