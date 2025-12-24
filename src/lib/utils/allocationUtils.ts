/**
 * Utility functions for working with multiple task allocations per user
 */

import { TaskTeam, GroupedTaskTeam, AllocationPeriod } from '@/types';

/**
 * Group allocations by user
 * Useful for displaying a single row per user with multiple allocation periods
 * 
 * @param allocations - Array of TaskTeam allocations
 * @returns Array of GroupedTaskTeam with allocations grouped by userId
 */
export function groupAllocationsByUser(allocations: TaskTeam[]): GroupedTaskTeam[] {
  const userMap = new Map<string, GroupedTaskTeam>();

  for (const allocation of allocations) {
    const userId = allocation.userId;
    
    if (!userMap.has(userId)) {
      userMap.set(userId, {
        userId,
        userName: allocation.user?.name || allocation.User?.name || null,
        userEmail: allocation.user?.email || allocation.User?.email || '',
        userImage: allocation.user?.image || allocation.User?.image,
        role: allocation.role as any,
        allocations: [],
        totalAllocatedHours: 0,
        totalActualHours: 0,
      });
    }

    const grouped = userMap.get(userId)!;
    
    // Add this allocation period
    const period: AllocationPeriod = {
      allocationId: allocation.id,
      startDate: allocation.startDate || null,
      endDate: allocation.endDate || null,
      allocatedHours: allocation.allocatedHours ? Number(allocation.allocatedHours) : null,
      allocatedPercentage: allocation.allocatedPercentage || null,
      actualHours: allocation.actualHours ? Number(allocation.actualHours) : null,
    };
    
    grouped.allocations.push(period);
    
    // Update totals
    if (period.allocatedHours) {
      grouped.totalAllocatedHours += period.allocatedHours;
    }
    if (period.actualHours) {
      grouped.totalActualHours += period.actualHours;
    }
  }

  return Array.from(userMap.values());
}

/**
 * Check if a user has multiple allocation periods on a task
 * 
 * @param allocations - Array of TaskTeam allocations
 * @param userId - The user ID to check
 * @returns True if user has more than one allocation period
 */
export function hasMultipleAllocations(allocations: TaskTeam[], userId: string): boolean {
  return allocations.filter(a => a.userId === userId).length > 1;
}

/**
 * Get all allocation periods for a specific user
 * 
 * @param allocations - Array of TaskTeam allocations
 * @param userId - The user ID
 * @returns Array of allocation periods for the user
 */
export function getUserAllocations(allocations: TaskTeam[], userId: string): TaskTeam[] {
  return allocations
    .filter(a => a.userId === userId)
    .sort((a, b) => {
      // Sort by start date, then by created date
      if (a.startDate && b.startDate) {
        return a.startDate.getTime() - b.startDate.getTime();
      }
      if (a.startDate && !b.startDate) return -1;
      if (!a.startDate && b.startDate) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
}

/**
 * Format allocation period for display
 * 
 * @param allocation - The allocation to format
 * @returns Formatted string like "Jan 1 - Jan 31, 2025" or "Ongoing"
 */
export function formatAllocationPeriod(allocation: TaskTeam | AllocationPeriod): string {
  const startDate = allocation.startDate;
  const endDate = allocation.endDate;

  if (!startDate && !endDate) {
    return 'Ongoing';
  }

  if (!startDate || !endDate) {
    return 'Date range incomplete';
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

/**
 * Count unique users in an allocation list
 * Useful when you have multiple allocations per user
 * 
 * @param allocations - Array of TaskTeam allocations
 * @returns Number of unique users
 */
export function countUniqueUsers(allocations: TaskTeam[]): number {
  const uniqueUserIds = new Set(allocations.map(a => a.userId));
  return uniqueUserIds.size;
}














