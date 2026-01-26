import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/utils/apiUtils';
import { calculateBusinessDays, calculateAvailableHours } from '@/lib/utils/dateUtils';
import { prisma } from '@/lib/db/prisma';
import { NonClientEventType } from '@/types';
import { startOfDay } from 'date-fns';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { CreateNonClientAllocationSchema } from '@/lib/validation/schemas';

/**
 * GET /api/non-client-allocations
 * List non-client allocations with filters
 */
export const GET = secureRoute.query({
  feature: Feature.MANAGE_TASKS,
  handler: async (request, { user }) => {
    const searchParams = request.nextUrl.searchParams;
    const employeeIdStr = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const eventType = searchParams.get('eventType') as NonClientEventType | null;

    const where: Record<string, unknown> = {};
    
    if (employeeIdStr) {
      where.employeeId = parseInt(employeeIdStr, 10);
    }

    if (startDate && endDate) {
      where.AND = [
        { startDate: { lte: new Date(endDate) } },
        { endDate: { gte: new Date(startDate) } }
      ];
    } else if (startDate) {
      where.endDate = { gte: new Date(startDate) };
    } else if (endDate) {
      where.startDate = { lte: new Date(endDate) };
    }

    if (eventType) {
      where.eventType = eventType;
    }

    const allocations = await prisma.nonClientAllocation.findMany({
      where,
      select: {
        id: true, employeeId: true, eventType: true, startDate: true, endDate: true,
        allocatedHours: true, allocatedPercentage: true, notes: true,
        createdBy: true, createdAt: true, updatedAt: true,
        Employee: { select: { id: true, EmpCode: true, EmpName: true, EmpNameFull: true } }
      },
      orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }]
    });

    const formattedAllocations = allocations.map(allocation => ({
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
      employee: allocation.Employee,
    }));

    return NextResponse.json(successResponse(formattedAllocations));
  },
});

/**
 * POST /api/non-client-allocations
 * Create new non-client allocation
 */
export const POST = secureRoute.mutation({
  feature: Feature.MANAGE_TASKS,
  schema: CreateNonClientAllocationSchema,
  handler: async (request, { user, data }) => {
    const { employeeId, eventType, startDate: startDateStr, endDate: endDateStr, notes } = data;

    // Schema already validates: required fields, valid eventType, startDate <= endDate
    const startDate = startOfDay(new Date(startDateStr));
    const endDate = startOfDay(new Date(endDateStr));

    const businessDays = calculateBusinessDays(startDate, endDate);
    if (businessDays === 0) {
      return NextResponse.json(
        { success: false, error: 'Date range must include at least one business day (Monday-Friday)' },
        { status: 400 }
      );
    }

    const availableHours = calculateAvailableHours(startDate, endDate);
    const allocatedHours = availableHours;
    const allocatedPercentage = 100;

    const overlaps = await prisma.nonClientAllocation.findMany({
      where: {
        employeeId,
        AND: [{ startDate: { lte: endDate } }, { endDate: { gte: startDate } }]
      },
      select: { id: true, eventType: true }
    });

    const allocation = await prisma.nonClientAllocation.create({
      data: { employeeId, eventType, startDate, endDate, allocatedHours, allocatedPercentage, notes: notes || null, createdBy: user.id, updatedAt: new Date() },
      select: {
        id: true, employeeId: true, eventType: true, startDate: true, endDate: true,
        allocatedHours: true, allocatedPercentage: true, notes: true,
        createdBy: true, createdAt: true, updatedAt: true,
        Employee: { select: { id: true, EmpCode: true, EmpName: true, EmpNameFull: true } }
      }
    });

    const response = {
      allocation: {
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
        employee: allocation.Employee,
      },
      warnings: overlaps.length > 0 ? [`Employee has ${overlaps.length} overlapping non-client event(s)`] : []
    };

    return NextResponse.json(response, { status: 201 });
  },
});
