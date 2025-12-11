import { TaskRole } from '@/types';

export type TimeScale = 'day' | 'week' | 'month';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface TimelineColumn {
  date: Date;
  label: string;
  isWeekend?: boolean;
  isToday?: boolean;
}

export interface AllocationData {
  id: number;
  taskId: number;
  taskName: string;
  role: TaskRole;
  startDate: Date;
  endDate: Date;
  allocatedHours: number | null;
  allocatedPercentage: number | null;
  actualHours: number | null;
}

export interface ResourceData {
  userId: string;
  userName: string;
  userEmail: string;
  userImage?: string | null;
  jobTitle?: string | null;
  officeLocation?: string | null;
  role: string;
  allocations: AllocationData[];
  totalAllocatedHours: number;
  totalAllocatedPercentage: number;
}

export interface GanttPosition {
  left: number;
  width: number;
}


