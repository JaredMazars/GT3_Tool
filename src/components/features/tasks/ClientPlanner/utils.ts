import { 
  startOfDay, 
  differenceInDays,
  eachDayOfInterval,
  isWeekend as isoWeekend,
  addDays
} from 'date-fns';
import { TimeScale, DateRange, GanttPosition, AllocationData, TaskPlannerRow } from './types';
import { ServiceLineRole } from '@/types';
import { 
  getDateRange as importedGetDateRange,
  generateTimelineColumns as importedGenerateTimelineColumns,
  getColumnWidth as importedGetColumnWidth,
  getDayPixelWidth as importedGetDayPixelWidth,
  snapToDay as importedSnapToDay,
  pixelsToDays as importedPixelsToDays,
  daysToPixels as importedDaysToPixels,
  calculateBusinessDays as importedCalculateBusinessDays,
  calculateAvailableHours as importedCalculateAvailableHours,
  calculateAllocationPercentage as importedCalculateAllocationPercentage,
  getRoleGradient as importedGetRoleGradient,
  formatHours as importedFormatHours,
  formatPercentage as importedFormatPercentage
} from '../TeamPlanner/utils';

// Re-export common utilities from TeamPlanner that are identical
export { 
  getDateRange, 
  generateTimelineColumns, 
  getColumnWidth,
  getDayPixelWidth,
  snapToDay,
  pixelsToDays,
  daysToPixels,
  calculateBusinessDays,
  calculateAvailableHours,
  calculateAllocationPercentage
} from '../TeamPlanner/utils';

// Use imported functions locally
const getDayPixelWidth = importedGetDayPixelWidth;
const calculateBusinessDays = importedCalculateBusinessDays;

/**
 * Calculate position and width for an allocation tile
 */
export function calculateTilePosition(
  allocation: AllocationData,
  range: DateRange,
  scale: TimeScale,
  columnWidth: number
): GanttPosition | null {
  if (!allocation.startDate || !allocation.endDate) {
    return null;
  }

  const start = startOfDay(new Date(allocation.startDate));
  const end = startOfDay(new Date(allocation.endDate));
  const rangeStart = startOfDay(range.start);
  const rangeEnd = startOfDay(range.end);
  
  // Check if allocation overlaps with visible range
  if (end < rangeStart || start > rangeEnd) {
    return null;
  }

  // Clamp dates to visible range
  const visibleStart = start < rangeStart ? rangeStart : start;
  const visibleEnd = end > rangeEnd ? rangeEnd : end;

  // Get pixel width of one day for this scale
  const dayPixelWidth = getDayPixelWidth(scale, columnWidth);
  
  // Calculate position in days from range start
  const startDays = differenceInDays(visibleStart, rangeStart);
  const durationDays = differenceInDays(visibleEnd, visibleStart) + 1; // Inclusive end date
  
  return {
    left: startDays * dayPixelWidth,
    width: durationDays * dayPixelWidth
  };
}

/**
 * Check if two allocations overlap in time
 * Exact match to TeamPlanner implementation
 */
export function allocationsOverlap(a: AllocationData, b: AllocationData): boolean {
  if (!a.startDate || !a.endDate || !b.startDate || !b.endDate) {
    return false;
  }

  const aStart = new Date(a.startDate).getTime();
  const aEnd = new Date(a.endDate).getTime();
  const bStart = new Date(b.startDate).getTime();
  const bEnd = new Date(b.endDate).getTime();

  return aStart <= bEnd && aEnd >= bStart;
}

/**
 * Assign lanes to allocations to minimize overlaps
 * Uses exact TeamPlanner algorithm - lanes pack efficiently
 */
export function assignLanes(allocations: AllocationData[]): AllocationData[] {
  if (allocations.length === 0) {
    return [];
  }

  // Sort by start date
  const sorted = [...allocations].sort((a, b) => {
    const aStart = a.startDate ? new Date(a.startDate).getTime() : 0;
    const bStart = b.startDate ? new Date(b.startDate).getTime() : 0;
    return aStart - bStart;
  });

  // Track lanes: array of arrays, each lane contains allocations
  const lanes: AllocationData[][] = [];

  for (const allocation of sorted) {
    // Find first lane where this allocation doesn't overlap
    let assignedLane = -1;
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      if (!lane) continue;

      const laneHasOverlap = lane.some(existing =>
        allocationsOverlap(existing, allocation)
      );
      if (!laneHasOverlap) {
        assignedLane = i;
        break;
      }
    }

    // If no available lane, create new one
    if (assignedLane === -1) {
      assignedLane = lanes.length;
      lanes.push([]);
    }

    allocation.lane = assignedLane;
    const lane = lanes[assignedLane];
    if (lane) {
      lane.push(allocation);
    }
  }

  return allocations;
}

/**
 * Calculate maximum lanes needed for a task
 * Matches TeamPlanner implementation exactly
 */
export function calculateMaxLanes(allocations: AllocationData[]): number {
  if (allocations.length === 0) {
    return 1; // Minimum 1 lane even with no allocations
  }

  // Assign lanes first
  const withLanes = assignLanes(allocations);

  // Find the maximum lane index
  const maxLane = withLanes.reduce((max, alloc) => {
    return Math.max(max, alloc.lane ?? 0);
  }, 0);

  // Return number of lanes (max index + 1)
  return maxLane + 1;
}

/**
 * Process task data from API response
 * Assigns lanes to allocations within each task row
 */
export function processTaskData(tasks: Array<Omit<TaskPlannerRow, 'maxLanes'>>): TaskPlannerRow[] {
  return tasks.map(task => {
    // Assign lanes within THIS task only
    const allocationsWithLanes = assignLanes(task.allocations);
    const maxLanes = calculateMaxLanes(allocationsWithLanes);
    
    return {
      ...task,
      allocations: allocationsWithLanes,
      maxLanes // Use actual calculated lanes (minimum 1 from calculateMaxLanes)
    };
  });
}

/**
 * Calculate total hours across multiple allocations
 */
export function calculateTotalHours(allocations: AllocationData[]): number {
  return allocations.reduce((total, alloc) => {
    return total + (alloc.allocatedHours || 0);
  }, 0);
}

/**
 * Calculate total percentage across multiple allocations
 * Note: This is a sum, not an average
 */
export function calculateTotalPercentage(allocations: AllocationData[]): number {
  return allocations.reduce((total, alloc) => {
    return total + (alloc.allocatedPercentage || 0);
  }, 0);
}

// Re-export formatting functions
export const getRoleGradient = importedGetRoleGradient;
export const formatHours = importedFormatHours;
export const formatPercentage = importedFormatPercentage;

// Re-export text color helper from colorUtils
export { getTextColorForGradient } from '@/lib/utils/colorUtils';

/**
 * Get utilization color based on percentage
 * Returns darkened version of role color based on utilization percentage
 * @param roleGradient - CSS gradient string for the role color
 * @param percentage - Utilization percentage (0-100+)
 * @returns CSS color string (solid, darkened shade of role color)
 */
export function getUtilizationBlendColor(roleGradient: string, percentage: number | null): string {
  if (percentage === null || percentage === 0) return 'transparent';
  
  // Import the darkening function from colorUtils
  const { darkenGradientForUtilization } = require('@/lib/utils/colorUtils');
  return darkenGradientForUtilization(roleGradient, percentage);
}

/**
 * Get readable employee name from allocation data
 */
export function getEmployeeDisplayName(allocation: AllocationData): string {
  if (allocation.employeeName) {
    return allocation.employeeName;
  }
  // Fallback to userId without domain
  return allocation.userId.split('@')[0] || allocation.userId;
}

// Export getDayPixelWidth function type for TypeScript
import type { getDayPixelWidth as GetDayPixelWidthType } from '../TeamPlanner/utils';
export type GetDayPixelWidth = typeof GetDayPixelWidthType;












