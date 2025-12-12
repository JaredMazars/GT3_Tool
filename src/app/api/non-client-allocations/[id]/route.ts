import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { sanitizeObject } from '@/lib/utils/sanitization';
import { calculateBusinessDays, calculateAvailableHours } from '@/lib/utils/dateUtils';
import { prisma } from '@/lib/db/prisma';
import { NonClientEventType } from '@/types';
import { startOfDay } from 'date-fns';

/**
 * PUT /api/non-client-allocations/[id]
 * Update existing non-client allocation
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check feature permission
    const hasPermission = await checkFeature(user.id, Feature.MANAGE_TASKS);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Get allocation ID
    const { id } = await context.params;
    const allocationId = parseInt(id, 10);
    
    if (isNaN(allocationId)) {
      return NextResponse.json({ error: 'Invalid allocation ID' }, { status: 400 });
    }

    // 4. Check allocation exists
    const existingAllocation = await prisma.nonClientAllocation.findUnique({
      where: { id: allocationId },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        allocatedHours: true,
        notes: true
      }
    });

    if (!existingAllocation) {
      return NextResponse.json({ error: 'Allocation not found' }, { status: 404 });
    }

    // 5. Parse and sanitize request body
    const body = await request.json();
    const sanitized = sanitizeObject(body);

    const {
      eventType,
      startDate: startDateStr,
      endDate: endDateStr,
      notes
    } = sanitized;

    // 6. Validate event type if provided
    if (eventType && !Object.values(NonClientEventType).includes(eventType)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      );
    }

    // 7. Parse and validate dates if provided
    let startDate = existingAllocation.startDate;
    let endDate = existingAllocation.endDate;
    let recalculateHours = false;

    if (startDateStr) {
      startDate = startOfDay(new Date(startDateStr));
      recalculateHours = true;
    }

    if (endDateStr) {
      endDate = startOfDay(new Date(endDateStr));
      recalculateHours = true;
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'End date cannot be before start date' },
        { status: 400 }
      );
    }

    // 8. Recalculate hours if dates changed (100% utilization)
    // Convert Decimal to number for proper handling
    let allocatedHours = typeof existingAllocation.allocatedHours === 'object' && existingAllocation.allocatedHours !== null
      ? parseFloat(existingAllocation.allocatedHours.toString())
      : existingAllocation.allocatedHours;
    
    if (recalculateHours) {
      const businessDays = calculateBusinessDays(startDate, endDate);
      if (businessDays === 0) {
        return NextResponse.json(
          { error: 'Date range must include at least one business day (Monday-Friday)' },
          { status: 400 }
        );
      }
      
      const availableHours = calculateAvailableHours(startDate, endDate);
      allocatedHours = availableHours; // 100% utilization
    }

    // 9. Update allocation
    const allocation = await prisma.nonClientAllocation.update({
      where: { id: allocationId },
      data: {
        ...(eventType && { eventType }),
        startDate,
        endDate,
        allocatedHours,
        allocatedPercentage: 100, // Always 100%
        notes: notes !== undefined ? notes : existingAllocation.notes,
      },
      select: {
        id: true,
        employeeId: true,
        eventType: true,
        startDate: true,
        endDate: true,
        allocatedHours: true,
        allocatedPercentage: true,
        notes: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    // 10. Format and return response
    const response = {
      id: allocation.id,
      employeeId: allocation.employeeId,
      eventType: allocation.eventType,
      startDate: allocation.startDate,
      endDate: allocation.endDate,
      allocatedHours: parseFloat(allocation.allocatedHours.toString()),
      allocatedPercentage: allocation.allocatedPercentage,
      notes: allocation.notes,
      createdBy: allocation.createdBy,
      createdAt: allocation.createdAt,
      updatedAt: allocation.updatedAt,
    };

    return NextResponse.json(successResponse(response));
  } catch (error) {
    return handleApiError(error, 'Failed to update non-client allocation');
  }
}

/**
 * DELETE /api/non-client-allocations/[id]
 * Remove non-client allocation
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check feature permission
    const hasPermission = await checkFeature(user.id, Feature.MANAGE_TASKS);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Get allocation ID
    const { id } = await context.params;
    const allocationId = parseInt(id, 10);
    
    if (isNaN(allocationId)) {
      return NextResponse.json({ error: 'Invalid allocation ID' }, { status: 400 });
    }

    // 4. Check allocation exists
    const existingAllocation = await prisma.nonClientAllocation.findUnique({
      where: { id: allocationId },
      select: {
        id: true
      }
    });

    if (!existingAllocation) {
      return NextResponse.json({ error: 'Allocation not found' }, { status: 404 });
    }

    // 5. Delete allocation
    await prisma.nonClientAllocation.delete({
      where: { id: allocationId }
    });

    return NextResponse.json(
      { message: 'Non-client allocation deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Failed to delete non-client allocation');
  }
}
