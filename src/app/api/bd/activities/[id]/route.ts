/**
 * BD Activity by ID API Routes
 * GET /api/bd/activities/[id] - Get activity details
 * PUT /api/bd/activities/[id] - Update activity
 * DELETE /api/bd/activities/[id] - Delete activity
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { UpdateBDActivitySchema } from '@/lib/validation/schemas';
import {
  updateActivity,
  deleteActivity,
} from '@/lib/services/bd/activityService';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const activityId = parseInt(id);

    const activity = await prisma.bDActivity.findUnique({
      where: { id: activityId },
      include: {
        Opportunity: {
          select: {
            id: true,
            title: true,
            companyName: true,
          },
        },
        Contact: {
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
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    return NextResponse.json(successResponse(activity));
  } catch (error) {
    return handleApiError(error, 'GET /api/bd/activities/[id]');
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const activityId = parseInt(id);

    const body = await request.json();
    const validated = UpdateBDActivitySchema.parse(body);

    const activity = await updateActivity(activityId, validated);

    return NextResponse.json(successResponse(activity));
  } catch (error) {
    return handleApiError(error, 'PUT /api/bd/activities/[id]');
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const activityId = parseInt(id);

    await deleteActivity(activityId);

    return NextResponse.json(successResponse({ deleted: true }));
  } catch (error) {
    return handleApiError(error, 'DELETE /api/bd/activities/[id]');
  }
}

