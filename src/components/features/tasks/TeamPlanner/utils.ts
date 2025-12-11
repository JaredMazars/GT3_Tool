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
        start: startOfDay(addDays(referenceDate, -7)),
        end: endOfDay(addDays(referenceDate, 30))
      };
    case 'week':
      return {
        start: startOfWeek(addWeeks(referenceDate, -2)),
        end: endOfWeek(addWeeks(referenceDate, 12))
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
      return eachDayOfInterval(range).map(date => ({
        date,
        label: format(date, 'EEE d'),
        isWeekend: isWeekend(date),
        isToday: isToday(date)
      }));
      
    case 'week':
      return eachWeekOfInterval(range, { weekStartsOn: 1 }).map(date => {
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
        return {
          date,
          label: `${format(date, 'MMM d')} - ${format(weekEnd, 'd')}`,
          isToday: isSameDay(startOfWeek(now, { weekStartsOn: 1 }), date)
        };
      });
      
    case 'month':
      return eachMonthOfInterval(range).map(date => ({
        date,
        label: format(date, 'MMM yyyy'),
        isToday: format(now, 'yyyy-MM') === format(date, 'yyyy-MM')
      }));
  }
}

/**
 * Get column width in pixels based on scale
 */
export function getColumnWidth(scale: TimeScale): number {
  switch (scale) {
    case 'day':
      return 60;
    case 'week':
      return 100;
    case 'month':
      return 120;
  }
}

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

  const start = new Date(allocation.startDate);
  const end = new Date(allocation.endDate);
  
  // Check if allocation overlaps with visible range
  if (end < range.start || start > range.end) {
    return null;
  }

  // Clamp dates to visible range
  const visibleStart = start < range.start ? range.start : start;
  const visibleEnd = end > range.end ? range.end : end;

  // Calculate position based on scale
  let leftPosition: number;
  let width: number;

  switch (scale) {
    case 'day': {
      // In day view, each column is one day
      const startDays = differenceInDays(visibleStart, range.start);
      const durationDays = differenceInDays(visibleEnd, visibleStart) + 1;
      
      leftPosition = startDays * columnWidth;
      width = durationDays * columnWidth;
      break;
    }
      
    case 'week': {
      // In week view, each column represents one week starting Monday
      // Calculate partial week offsets for precise positioning
      const rangeWeekStart = startOfWeek(range.start, { weekStartsOn: 1 });
      const startWeekStart = startOfWeek(visibleStart, { weekStartsOn: 1 });
      const endWeekStart = startOfWeek(visibleEnd, { weekStartsOn: 1 });
      
      // Calculate which week column the start date falls in
      const weeksFromRangeToStart = differenceInWeeks(startWeekStart, rangeWeekStart);
      
      // Calculate day offset within the start week
      const dayOffsetInStartWeek = differenceInDays(visibleStart, startWeekStart);
      
      // Calculate total duration in days
      const durationDays = differenceInDays(visibleEnd, visibleStart) + 1;
      
      leftPosition = (weeksFromRangeToStart * columnWidth) + (dayOffsetInStartWeek / 7 * columnWidth);
      width = (durationDays / 7) * columnWidth;
      break;
    }
      
    case 'month': {
      // In month view, each column represents one month
      const rangeMonthStart = startOfMonth(range.start);
      const startMonthStart = startOfMonth(visibleStart);
      const endMonthStart = startOfMonth(visibleEnd);
      
      // Calculate which month column the start date falls in
      const monthsFromRangeToStart = differenceInMonths(startMonthStart, rangeMonthStart);
      
      // Calculate day offset within the start month
      const dayOffsetInStartMonth = differenceInDays(visibleStart, startMonthStart);
      const daysInStartMonth = differenceInDays(endOfMonth(startMonthStart), startMonthStart) + 1;
      
      // Calculate total duration in days
      const durationDays = differenceInDays(visibleEnd, visibleStart) + 1;
      const averageDaysInMonth = 30; // Approximate
      
      leftPosition = (monthsFromRangeToStart * columnWidth) + (dayOffsetInStartMonth / averageDaysInMonth * columnWidth);
      width = (durationDays / averageDaysInMonth) * columnWidth;
      break;
    }
  }

  return {
    left: leftPosition,
    width: Math.max(width, columnWidth * 0.5) // Minimum half column width
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


