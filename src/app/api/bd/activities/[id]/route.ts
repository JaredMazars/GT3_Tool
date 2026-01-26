/**
 * BD Activity by ID API Routes
 * GET /api/bd/activities/[id] - Get activity details
 * PUT /api/bd/activities/[id] - Update activity
 * DELETE /api/bd/activities/[id] - Delete activity
 */

import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { UpdateBDActivitySchema } from '@/lib/validation/schemas';
import {
  updateActivity,
  deleteActivity,
} from '@/lib/services/bd/activityService';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

/**
 * GET /api/bd/activities/[id]
 * Get activity details
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_BD,
  handler: async (request, { user, params }) => {
    const activityId = parseNumericId(params.id, 'Activity');

    const activity = await prisma.bDActivity.findUnique({
      where: { id: activityId },
      select: {
        id: true,
        opportunityId: true,
        contactId: true,
        activityType: true,
        subject: true,
        description: true,
        status: true,
        dueDate: true,
        completedAt: true,
        duration: true,
        location: true,
        assignedTo: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        BDOpportunity: {
          select: {
            id: true,
            title: true,
            companyName: true,
          },
        },
        BDContact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!activity) {
      throw new AppError(404, 'Activity not found', ErrorCodes.NOT_FOUND);
    }

    return NextResponse.json(successResponse(activity));
  },
});

/**
 * PUT /api/bd/activities/[id]
 * Update activity
 */
export const PUT = secureRoute.mutationWithParams({
  feature: Feature.ACCESS_BD,
  schema: UpdateBDActivitySchema,
  handler: async (request, { user, params, data }) => {
    const activityId = parseNumericId(params.id, 'Activity');

    // Verify activity exists
    const existing = await prisma.bDActivity.findUnique({
      where: { id: activityId },
      select: { id: true },
    });

    if (!existing) {
      throw new AppError(404, 'Activity not found', ErrorCodes.NOT_FOUND);
    }

    const activity = await updateActivity(activityId, {
      contactId: data.contactId,
      activityType: data.activityType,
      subject: data.subject,
      description: data.description,
      status: data.status,
      dueDate: data.dueDate,
      completedAt: data.completedAt,
      duration: data.duration,
      location: data.location,
      assignedTo: data.assignedTo,
    });

    return NextResponse.json(successResponse(activity));
  },
});

/**
 * DELETE /api/bd/activities/[id]
 * Delete activity
 */
export const DELETE = secureRoute.mutationWithParams({
  feature: Feature.ACCESS_BD,
  handler: async (request, { user, params }) => {
    const activityId = parseNumericId(params.id, 'Activity');

    // Verify activity exists
    const existing = await prisma.bDActivity.findUnique({
      where: { id: activityId },
      select: { id: true },
    });

    if (!existing) {
      throw new AppError(404, 'Activity not found', ErrorCodes.NOT_FOUND);
    }

    await deleteActivity(activityId);

    return NextResponse.json(successResponse({ deleted: true }));
  },
});
