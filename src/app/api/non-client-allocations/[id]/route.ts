import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { calculateBusinessDays, calculateAvailableHours } from '@/lib/utils/dateUtils';
import { prisma } from '@/lib/db/prisma';
import { NonClientEventType } from '@/types';
import { startOfDay } from 'date-fns';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { z } from 'zod';
import { invalidatePlannerCachesForServiceLine } from '@/lib/services/cache/cacheInvalidation';

const UpdateAllocationSchema = z.object({
  eventType: z.nativeEnum(NonClientEventType).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().nullable().optional(),
}).strict();

/**
 * PUT /api/non-client-allocations/[id]
 * Update existing non-client allocation
 */
export const PUT = secureRoute.mutationWithParams<typeof UpdateAllocationSchema, { id: string }>({
  feature: Feature.MANAGE_TASKS,
  schema: UpdateAllocationSchema,
  handler: async (request, { user, params, data }) => {
    const allocationId = Number.parseInt(params.id, 10);

    if (Number.isNaN(allocationId)) {
      return NextResponse.json({ success: false, error: 'Invalid allocation ID' }, { status: 400 });
    }

    const existingAllocation = await prisma.nonClientAllocation.findUnique({
      where: { id: allocationId },
      select: { id: true, startDate: true, endDate: true, allocatedHours: true, notes: true },
    });

    if (!existingAllocation) {
      return NextResponse.json({ success: false, error: 'Allocation not found' }, { status: 404 });
    }

    let startDate = existingAllocation.startDate;
    let endDate = existingAllocation.endDate;
    let recalculateHours = false;

    if (data.startDate) {
      startDate = startOfDay(new Date(data.startDate));
      recalculateHours = true;
    }

    if (data.endDate) {
      endDate = startOfDay(new Date(data.endDate));
      recalculateHours = true;
    }

    if (startDate > endDate) {
      return NextResponse.json({ success: false, error: 'End date cannot be before start date' }, { status: 400 });
    }

    let allocatedHours =
      typeof existingAllocation.allocatedHours === 'object' && existingAllocation.allocatedHours !== null
        ? Number.parseFloat(existingAllocation.allocatedHours.toString())
        : existingAllocation.allocatedHours;

    if (recalculateHours) {
      const businessDays = calculateBusinessDays(startDate, endDate);
      if (businessDays === 0) {
        return NextResponse.json(
          { success: false, error: 'Date range must include at least one business day (Monday-Friday)' },
          { status: 400 }
        );
      }
      allocatedHours = calculateAvailableHours(startDate, endDate);
    }

    const allocation = await prisma.nonClientAllocation.update({
      where: { id: allocationId },
      data: {
        ...(data.eventType && { eventType: data.eventType }),
        startDate,
        endDate,
        allocatedHours,
        allocatedPercentage: 100,
        notes: data.notes !== undefined ? data.notes : existingAllocation.notes,
      },
      select: {
        id: true, employeeId: true, eventType: true, startDate: true, endDate: true,
        allocatedHours: true, allocatedPercentage: true, notes: true,
        createdBy: true, createdAt: true, updatedAt: true,
      },
    });

    return NextResponse.json(
      successResponse({
        id: allocation.id,
        employeeId: allocation.employeeId,
        eventType: allocation.eventType,
        startDate: allocation.startDate,
        endDate: allocation.endDate,
        allocatedHours: Number.parseFloat(allocation.allocatedHours.toString()),
        allocatedPercentage: allocation.allocatedPercentage,
        notes: allocation.notes,
        createdBy: allocation.createdBy,
        createdAt: allocation.createdAt,
        updatedAt: allocation.updatedAt,
      })
    );
  },
});

/**
 * DELETE /api/non-client-allocations/[id]
 * Remove non-client allocation
 */
export const DELETE = secureRoute.mutationWithParams<z.ZodAny, { id: string }>({
  feature: Feature.MANAGE_TASKS,
  handler: async (request, { user, params }) => {
    const allocationId = Number.parseInt(params.id, 10);

    if (Number.isNaN(allocationId)) {
      return NextResponse.json({ success: false, error: 'Invalid allocation ID' }, { status: 400 });
    }

    const existingAllocation = await prisma.nonClientAllocation.findUnique({
      where: { id: allocationId },
      select: { id: true },
    });

    if (!existingAllocation) {
      return NextResponse.json({ success: false, error: 'Allocation not found' }, { status: 404 });
    }

    await prisma.nonClientAllocation.delete({
      where: { id: allocationId },
    });

    return NextResponse.json(successResponse({ message: 'Non-client allocation deleted successfully' }));
  },
});
