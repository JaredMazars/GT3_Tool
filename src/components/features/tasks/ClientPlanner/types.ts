import { ServiceLineRole } from '@/types';

export type TimeScale = 'day' | 'week' | 'month';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface TimelineColumn {
  date: Date;
  label: string;
  yearLabel?: string;
  isWeekend?: boolean;
  isToday?: boolean;
}

/**
 * Allocation data for client planner timeline
 * Represents an employee's allocation to a specific task (aligned with TeamPlanner structure)
 */
export interface AllocationData {
  id: number; // TaskTeam.id
  taskId: number;
  userId: string;
  employeeId: number | null;
  employeeName: string;
  employeeCode: string | null;
  jobGradeCode: string | null;
  officeLocation: string | null;
  role: ServiceLineRole | string;
  startDate: Date;
  endDate: Date;
  allocatedHours: number | null;
  allocatedPercentage: number | null;
  actualHours: number | null;
  lane?: number; // Which lane (0-indexed) this allocation occupies in the row
}

// Legacy alias for backwards compatibility during migration
export type EmployeeAllocationData = AllocationData;

/**
 * Task planner row for rendering (aligned with TeamPlanner ResourceData structure)
 * Each row represents a single task with employee allocations
 */
export interface TaskPlannerRow {
  // Task info
  taskId: number;
  taskCode: string;
  taskName: string;
  
  // Client info (for display)
  clientId: number;
  clientCode: string;
  clientName: string;
  groupDesc: string | null;
  clientPartner: string | null;
  
  // Employee allocations for this task
  allocations: AllocationData[];
  maxLanes: number; // Max overlapping allocations for THIS task
}

// Legacy aliases for backwards compatibility during migration
export type ClientTaskRow = TaskPlannerRow;
export interface ClientTaskItem {
  taskId: number;
  taskCode: string;
  taskName: string;
  employeeAllocations: AllocationData[];
  maxLanes: number;
}
export interface ClientTaskData {
  clientId: number;
  GSClientID: string;
  clientCode: string;
  clientName: string;
  groupDesc: string | null;
  clientPartner: string | null;
  tasks: ClientTaskItem[];
  maxLanes: number;
}

export interface GanttPosition {
  left: number;
  width: number;
}

export interface DateSelection {
  taskId: number; // The task row being selected
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
 * Uses TaskTeam.id which is unique across all allocations
 * Includes isNonClientEvent flag to prevent key collisions between client and non-client allocations
 */
export function getAllocationKey(allocation: AllocationData): string {
  return `allocation-${allocation.id}-client`;
}

export function getAllocationKeyById(id: number, isNonClientEvent: boolean = false): string {
  return `allocation-${id}-${isNonClientEvent ? 'non-client' : 'client'}`;
}

// Legacy aliases for backwards compatibility
export const getEmployeeAllocationKey = getAllocationKey;
export const getEmployeeAllocationKeyById = getAllocationKeyById;












