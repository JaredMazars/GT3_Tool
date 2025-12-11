import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format,
  isWeekend,
  isToday,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  addDays,
  addWeeks,
  addMonths,
  isSameDay
} from 'date-fns';
import { TimeScale, DateRange, TimelineColumn, GanttPosition, AllocationData } from './types';

/**
 * Get date range based on time scale
 */
export function getDateRange(scale: TimeScale, referenceDate: Date = new Date()): DateRange {
  switch (scale) {
    case 'day':
      return {
        start: startOfDay(addDays(referenceDate, -20)),
        end: endOfDay(addDays(referenceDate, 30))
      };
    case 'week':
      return {
        // CRITICAL: Use weekStartsOn: 1 (Monday) to match generateTimelineColumns
        start: startOfWeek(addWeeks(referenceDate, -2), { weekStartsOn: 1 }),
        end: endOfWeek(addWeeks(referenceDate, 12), { weekStartsOn: 1 })
      };
    case 'month':
      return {
        start: startOfMonth(addMonths(referenceDate, -1)),
        end: endOfMonth(addMonths(referenceDate, 11))
      };
  }
}

/**
 * Generate timeline columns based on scale
 */
export function generateTimelineColumns(range: DateRange, scale: TimeScale): TimelineColumn[] {
  const now = new Date();
  
  switch (scale) {
    case 'day':
      return eachDayOfInterval(range).map(date => {
        // Normalize to start of day to match position calculations
        const normalizedDate = startOfDay(date);
        return {
          date: normalizedDate,
          label: format(normalizedDate, 'd MMM yy'), // Show day, month, and abbreviated year (e.g., "11 Dec 24")
          isWeekend: isWeekend(normalizedDate),
          isToday: isToday(normalizedDate)
        };
      });
      
    case 'week':
      return eachWeekOfInterval(range, { weekStartsOn: 1 }).map(date => {
        // Normalize to start of day to match position calculations
        const normalizedDate = startOfDay(date);
        const weekEnd = endOfWeek(normalizedDate, { weekStartsOn: 1 });
        
        // Check if week spans different months or years
        const sameMonth = format(normalizedDate, 'MMM') === format(weekEnd, 'MMM');
        const sameYear = format(normalizedDate, 'yyyy') === format(weekEnd, 'yyyy');
        
        let label: string;
        let yearLabel: string;
        
        if (!sameYear) {
          // Different years: show date range without year, put year range below
          label = `${format(normalizedDate, 'd MMM')} - ${format(weekEnd, 'd MMM')}`;
          yearLabel = `${format(normalizedDate, 'yyyy')} - ${format(weekEnd, 'yyyy')}`;
        } else if (!sameMonth) {
          // Same year, different months
          label = `${format(normalizedDate, 'd MMM')} - ${format(weekEnd, 'd MMM')}`;
          yearLabel = format(normalizedDate, 'yyyy');
        } else {
          // Same month and year
          label = `${format(normalizedDate, 'd')} - ${format(weekEnd, 'd MMM')}`;
          yearLabel = format(normalizedDate, 'yyyy');
        }
        
        return {
          date: normalizedDate,
          label,
          yearLabel,
          isToday: isSameDay(startOfWeek(now, { weekStartsOn: 1 }), normalizedDate)
        };
      });
      
    case 'month':
      return eachMonthOfInterval(range).map(date => {
        // Normalize to start of day to match position calculations
        const normalizedDate = startOfDay(date);
        return {
          date: normalizedDate,
          label: format(normalizedDate, 'MMM yyyy'),
          isToday: format(now, 'yyyy-MM') === format(normalizedDate, 'yyyy-MM')
        };
      });
  }
}

/**
 * Get column width in pixels based on scale
 */
export function getColumnWidth(scale: TimeScale): number {
  switch (scale) {
    case 'day':
      return 70; // Compact format: "6 Dec 25"
    case 'week':
      return 120; // Compact format with year below
    case 'month':
      return 120;
  }
}

/**
 * Get pixel width of one day based on current scale
 * Day-based snapping: all views snap to individual days
 */
export function getDayPixelWidth(scale: TimeScale, columnWidth: number): number {
  switch (scale) {
    case 'day':
      return columnWidth; // 70px per day
    case 'week':
      return columnWidth / 7; // ~17.14px per day (120px / 7 days)
    case 'month':
      return columnWidth / 30; // ~4px per day (average)
  }
}

/**
 * Snap pixel position to nearest day boundary
 */
export function snapToDay(pixelPosition: number, dayPixelWidth: number): number {
  return Math.round(pixelPosition / dayPixelWidth) * dayPixelWidth;
}

/**
 * Convert pixel position to day index from range start
 */
export function pixelsToDays(pixels: number, dayPixelWidth: number): number {
  return Math.round(pixels / dayPixelWidth);
}

/**
 * Convert days from range start to pixel position
 */
export function daysToPixels(days: number, dayPixelWidth: number): number {
  return days * dayPixelWidth;
}

/**
 * Calculate position and width for an allocation tile
 * Uses day-based pixel calculations for all scales
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

  // Normalize dates to start of day to avoid time component issues
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
  
  // Calculate position in days from range start (now using normalized dates)
  const startDays = differenceInDays(visibleStart, rangeStart);
  // Calculate duration using difference + 1 for INCLUSIVE end date model
  // Date model: endDate is INCLUSIVE (both start and end dates are counted)
  // For 1-day allocation: start = 4th, end = 4th, diff = 0, +1 = 1 day ✓
  // For 2-day allocation: start = 4th, end = 5th, diff = 1, +1 = 2 days ✓
  const durationDays = differenceInDays(visibleEnd, visibleStart) + 1;
  
  // Convert days to pixels
  const leftPosition = daysToPixels(startDays, dayPixelWidth);
  const width = daysToPixels(Math.max(durationDays, 1), dayPixelWidth); // Minimum 1 day visual

  return {
    left: leftPosition,
    width: Math.max(width, dayPixelWidth) // Minimum one day width
  };
}

/**
 * Get role color gradient
 */
export function getRoleGradient(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'linear-gradient(135deg, #C084FC 0%, #9333EA 100%)'; // Purple
    case 'REVIEWER':
      return 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)'; // Blue
    case 'EDITOR':
      return 'linear-gradient(135deg, #4ADE80 0%, #16A34A 100%)'; // Green
    case 'VIEWER':
      return 'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)'; // Gray
    default:
      return 'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)';
  }
}

/**
 * Format hours for display
 */
export function formatHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) {
    return '-';
  }
  return `${hours.toFixed(1)}h`;
}

/**
 * Format percentage for display
 */
export function formatPercentage(percentage: number | null | undefined): string {
  if (percentage === null || percentage === undefined) {
    return '-';
  }
  return `${percentage}%`;
}

/**
 * Calculate total allocated hours for a resource
 */
export function calculateTotalHours(allocations: AllocationData[]): number {
  return allocations.reduce((total, alloc) => {
    return total + (alloc.allocatedHours || 0);
  }, 0);
}

/**
 * Calculate total allocated percentage for a resource
 */
export function calculateTotalPercentage(allocations: AllocationData[]): number {
  return allocations.reduce((total, alloc) => {
    return total + (alloc.allocatedPercentage || 0);
  }, 0);
}

/**
 * Check if two allocations overlap in time
 */
export function allocationsOverlap(a: AllocationData, b: AllocationData): boolean {
  if (!a.startDate || !a.endDate || !b.startDate || !b.endDate) {
    return false;
  }
  
  const aStart = new Date(a.startDate).getTime();
  const aEnd = new Date(a.endDate).getTime();
  const bStart = new Date(b.startDate).getTime();
  const bEnd = new Date(b.endDate).getTime();
  
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Assign lanes to allocations to minimize overlaps
 * Uses a greedy algorithm to pack allocations into lanes
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
 * Calculate the maximum number of lanes needed for allocations
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
 * Calculate number of business days (excluding weekends) between two dates
 * Uses INCLUSIVE end date model - both start and end dates are counted
 * @param startDate - First day of the period (inclusive)
 * @param endDate - Last day of the period (inclusive)
 * @returns Number of business days (Monday-Friday only)
 * @example
 * // 1st to 2nd = 2 days (both included)
 * calculateBusinessDays(new Date('2024-01-01'), new Date('2024-01-02')) // returns 2
 * // 4th to 4th = 1 day (same day)
 * calculateBusinessDays(new Date('2024-01-04'), new Date('2024-01-04')) // returns 1
 */
export function calculateBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  // Normalize to start of day
  current.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  // Use <= for INCLUSIVE end date (both start and end dates counted)
  while (current <= end) {
    const dayOfWeek = current.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Calculate total available hours based on business days
 * 8 hours per business day (standard workday)
 * @param startDate - First day of the period (inclusive)
 * @param endDate - Last day of the period (inclusive)
 * @returns Total available hours (business days × 8)
 */
export function calculateAvailableHours(startDate: Date, endDate: Date): number {
  const businessDays = calculateBusinessDays(startDate, endDate);
  return businessDays * 8;
}

/**
 * Calculate allocation percentage from hours
 * @param allocatedHours - Hours allocated to this task
 * @param totalAvailableHours - Total available hours in the period
 * @returns Percentage (0-100+), rounded to nearest integer
 */
export function calculateAllocationPercentage(
  allocatedHours: number,
  totalAvailableHours: number
): number {
  if (totalAvailableHours === 0) return 0;
  return Math.round((allocatedHours / totalAvailableHours) * 100);
}


