/**
 * Task Allocation Validation Utilities
 * 
 * Validates multiple allocations per user on the same task with:
 * - No overlapping date ranges
 * - Consistent roles across all allocations
 * - Date range validation
 */

import { prisma } from '@/lib/db/prisma';
import { TaskId } from '@/types/branded';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';

/**
 * Custom error class for allocation validation failures
 */
export class AllocationValidationError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(400, message, ErrorCodes.VALIDATION_ERROR, metadata);
    this.name = 'AllocationValidationError';
  }
}

/**
 * Validate that start date is before end date
 */
export function validateAllocationDates(
  startDate: Date | null | undefined,
  endDate: Date | null | undefined
): void {
  // Both null/undefined is valid (ongoing allocation)
  if (!startDate && !endDate) {
    return;
  }

  // If one is set, both must be set
  if ((startDate && !endDate) || (!startDate && endDate)) {
    throw new AllocationValidationError(
      'Both start date and end date must be provided, or both must be empty for ongoing assignments'
    );
  }

  // Start must be before or equal to end
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      throw new AllocationValidationError(
        'Start date must be before or equal to end date',
        {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        }
      );
    }
  }
}

/**
 * Check if two date ranges overlap (inclusive)
 * Returns true if ranges overlap
 * 
 * Overlap logic:
 * - Range A: [startA, endA]
 * - Range B: [startB, endB]
 * - Overlap if: startA <= endB AND endA >= startB
 * 
 * Null dates represent ongoing allocations - these always conflict with any dated range
 */
export function doRangesOverlap(
  startA: Date | null | undefined,
  endA: Date | null | undefined,
  startB: Date | null | undefined,
  endB: Date | null | undefined
): boolean {
  // If either range has no dates (ongoing), it conflicts with anything
  if ((!startA && !endA) || (!startB && !endB)) {
    return true;
  }

  // If we reach here, both ranges have dates
  if (!startA || !endA || !startB || !endB) {
    return false;
  }

  const start1 = new Date(startA);
  const end1 = new Date(endA);
  const start2 = new Date(startB);
  const end2 = new Date(endB);

  // Check overlap: start1 <= end2 AND end1 >= start2
  return start1 <= end2 && end1 >= start2;
}

/**
 * Check for overlapping allocations for a user on a task
 * Throws AllocationValidationError if overlaps are found
 * 
 * @param taskId - The task ID
 * @param userId - The user ID
 * @param startDate - Start date of the new/updated allocation
 * @param endDate - End date of the new/updated allocation
 * @param excludeId - Allocation ID to exclude (for updates)
 */
export async function checkOverlappingAllocations(
  taskId: TaskId,
  userId: string,
  startDate: Date | null | undefined,
  endDate: Date | null | undefined,
  excludeId?: number
): Promise<void> {
  // Get all existing allocations for this user on this task
  const existingAllocations = await prisma.taskTeam.findMany({
    where: {
      taskId,
      userId,
      ...(excludeId && { id: { not: excludeId } }),
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      role: true,
    },
  });

  // Check each existing allocation for overlap
  for (const allocation of existingAllocations) {
    if (doRangesOverlap(startDate, endDate, allocation.startDate, allocation.endDate)) {
      throw new AllocationValidationError(
        'This allocation period overlaps with an existing allocation for this user',
        {
          existingAllocationId: allocation.id,
          existingStartDate: allocation.startDate?.toISOString() || null,
          existingEndDate: allocation.endDate?.toISOString() || null,
          newStartDate: startDate?.toISOString() || null,
          newEndDate: endDate?.toISOString() || null,
        }
      );
    }
  }
}

/**
 * Validate that the role is consistent with existing allocations
 * All allocations for a user on a task must have the same role
 * 
 * @param taskId - The task ID
 * @param userId - The user ID
 * @param role - The role to validate
 * @param excludeId - Allocation ID to exclude (for updates)
 */
export async function validateRoleConsistency(
  taskId: TaskId,
  userId: string,
  role: string,
  excludeId?: number
): Promise<void> {
  // Get any existing allocation for this user on this task
  const existingAllocation = await prisma.taskTeam.findFirst({
    where: {
      taskId,
      userId,
      ...(excludeId && { id: { not: excludeId } }),
    },
    select: {
      id: true,
      role: true,
    },
  });

  // If exists and role is different, throw error
  if (existingAllocation && existingAllocation.role !== role) {
    throw new AllocationValidationError(
      `All allocations for this user must have the same role. Existing role: ${existingAllocation.role}`,
      {
        existingRole: existingAllocation.role,
        requestedRole: role,
        existingAllocationId: existingAllocation.id,
      }
    );
  }
}

/**
 * Validate a complete allocation (dates + role + overlaps)
 * Convenience function that runs all validations
 * 
 * @param taskId - The task ID
 * @param userId - The user ID
 * @param startDate - Start date of the allocation
 * @param endDate - End date of the allocation
 * @param role - The role for this allocation
 * @param excludeId - Allocation ID to exclude (for updates)
 */
export async function validateAllocation(
  taskId: TaskId,
  userId: string,
  startDate: Date | null | undefined,
  endDate: Date | null | undefined,
  role: string,
  excludeId?: number
): Promise<void> {
  // Validate date range
  validateAllocationDates(startDate, endDate);

  // Check for overlaps - DISABLED: Allow overlapping allocations
  // if (startDate || endDate) {
  //   await checkOverlappingAllocations(taskId, userId, startDate, endDate, excludeId);
  // }

  // Validate role consistency
  await validateRoleConsistency(taskId, userId, role, excludeId);
}

/**
 * Get all allocations for a user on a task
 * Useful for displaying existing allocations before adding a new one
 */
export async function getUserTaskAllocations(
  taskId: TaskId,
  userId: string
) {
  return await prisma.taskTeam.findMany({
    where: {
      taskId,
      userId,
    },
    select: {
      id: true,
      role: true,
      startDate: true,
      endDate: true,
      allocatedHours: true,
      allocatedPercentage: true,
      actualHours: true,
      createdAt: true,
    },
    orderBy: [
      { startDate: 'asc' },
      { createdAt: 'asc' },
    ],
  });
}

