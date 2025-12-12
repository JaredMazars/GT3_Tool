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
 * GET /api/non-client-allocations
 * List non-client allocations with filters
 */
export async function GET(request: NextRequest) {
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

    // 3. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const employeeIdStr = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const eventType = searchParams.get('eventType') as NonClientEventType | null;

    // 4. Build query filters
    const where: any = {};
    
    if (employeeIdStr) {
      where.employeeId = parseInt(employeeIdStr, 10);
    }

    if (startDate && endDate) {
      // Find allocations that overlap with the date range
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

    // 5. Execute query
    const allocations = await prisma.nonClientAllocation.findMany({
      where,
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
        Employee: {
          select: {
            id: true,
            EmpCode: true,
            EmpName: true,
            EmpNameFull: true,
          }
        }
      },
      orderBy: [
        { startDate: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    // 6. Transform response
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
  } catch (error) {
    return handleApiError(error, 'Failed to fetch non-client allocations');
  }
}

/**
 * POST /api/non-client-allocations
 * Create new non-client allocation with automatic 100% utilization
 */
export async function POST(request: NextRequest) {
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

    // 3. Parse and sanitize request body
    const body = await request.json();
    const sanitized = sanitizeObject(body);

    const {
      employeeId,
      eventType,
      startDate: startDateStr,
      endDate: endDateStr,
      notes
    } = sanitized;

    // 4. Validate required fields
    if (!employeeId || !eventType || !startDateStr || !endDateStr) {
      return NextResponse.json(
        { error: 'Missing required fields: employeeId, eventType, startDate, endDate' },
        { status: 400 }
      );
    }

    // 5. Validate event type
    if (!Object.values(NonClientEventType).includes(eventType)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      );
    }

    // 6. Parse and normalize dates
    const startDate = startOfDay(new Date(startDateStr));
    const endDate = startOfDay(new Date(endDateStr));

    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'End date cannot be before start date' },
        { status: 400 }
      );
    }

    // 7. Calculate business days and hours (100% utilization)
    const businessDays = calculateBusinessDays(startDate, endDate);
    if (businessDays === 0) {
      return NextResponse.json(
        { error: 'Date range must include at least one business day (Monday-Friday)' },
        { status: 400 }
      );
    }

    const availableHours = calculateAvailableHours(startDate, endDate);
    const allocatedHours = availableHours; // 100% utilization
    const allocatedPercentage = 100;

    // 8. Check for overlaps (warning only, not blocking)
    const overlaps = await prisma.nonClientAllocation.findMany({
      where: {
        employeeId,
        AND: [
          { startDate: { lte: endDate } },
          { endDate: { gte: startDate } }
        ]
      },
      select: {
        id: true,
        eventType: true
      }
    });

    // 9. Create allocation
    const allocation = await prisma.nonClientAllocation.create({
      data: {
        employeeId,
        eventType,
        startDate,
        endDate,
        allocatedHours,
        allocatedPercentage,
        notes: notes || null,
        createdBy: user.id
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
        Employee: {
          select: {
            id: true,
            EmpCode: true,
            EmpName: true,
            EmpNameFull: true,
          }
        }
      }
    });

    // 10. Format response
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
  } catch (error) {
    return handleApiError(error, 'Failed to create non-client allocation');
  }
}
