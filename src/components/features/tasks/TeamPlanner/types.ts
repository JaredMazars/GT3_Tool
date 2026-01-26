import { ServiceLineRole, NonClientEventType } from '@/types';

export type TimeScale = 'day' | 'week' | 'month';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface TimelineColumn {
  date: Date;
  label: string;
  yearLabel?: string; // Optional year label for week view
  isWeekend?: boolean;
  isToday?: boolean;
}

/**
 * Allocation data for team planner timeline
 * 
 * Date Model (Inclusive End Date):
 * - startDate: First day of allocation (inclusive)
 * - endDate: Last day of allocation (inclusive)
 * - Duration: differenceInDays(endDate, startDate) + 1
 * - Example: 1-day allocation on Jan 4 → start: Jan 4, end: Jan 4
 * - Example: 2-day allocation Jan 4-5 → start: Jan 4, end: Jan 5
 */
export interface AllocationData {
  id: number;
  taskId?: number | null; // Optional for non-client events
  taskName: string;
  taskCode?: string;
  clientName?: string | null;
  clientCode?: string | null;
  role: ServiceLineRole | string;
  startDate: Date;
  endDate: Date;
  allocatedHours: number | null;
  allocatedPercentage: number | null;
  actualHours: number | null;
  lane?: number; // Which lane (0-indexed) this allocation occupies in the row
  isCurrentTask?: boolean; // Whether this allocation belongs to the current task being viewed
  // Non-client event fields
  isNonClientEvent?: boolean;
  nonClientEventType?: NonClientEventType;
  notes?: string | null;
}

export interface ResourceData {
  userId: string;
  employeeId?: number; // Employee table ID (for non-client event planning)
  userName: string;
  userEmail: string;
  userImage?: string | null;
  jobTitle?: string | null;
  jobGradeCode?: string | null;
  officeLocation?: string | null;
  role: string;
  allocations: AllocationData[];
  totalAllocatedHours: number;
  totalAllocatedPercentage: number;
  maxLanes: number; // Maximum number of concurrent overlapping allocations
  employeeStatus?: { isActive: boolean; hasUserAccount: boolean }; // Employee status for badge display
}

export interface GanttPosition {
  left: number;
  width: number;
}

export interface DateSelection {
  userId: string;
  startColumnIndex: number;
  endColumnIndex: number | null;
}

export interface RowMetadata {
  rowIndex: number;
  rowHeight: number;
  cumulativeHeights: number[]; // Cumulative heights of all rows up to and including this index
}

/**
 * Generate composite key for optimistic updates
 * Prevents ID collision between client and non-client allocations
 */
export function getAllocationKey(allocation: AllocationData): string {
  const type = allocation.isNonClientEvent ? 'nonclient' : 'client';
  return `${type}-${allocation.id}`;
}

export function getAllocationKeyById(id: number, isNonClient: boolean): string {
  const type = isNonClient ? 'nonclient' : 'client';
  return `${type}-${id}`;
}


