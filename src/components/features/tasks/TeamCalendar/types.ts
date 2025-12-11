import { TaskRole, TeamMemberWithAllocations } from '@/types';

export interface CalendarTask {
  id: number;
  TaskDesc: string;
  TaskDateOpen: Date;
  TaskDateTerminate: Date | null;
}

export interface CalendarAllocation {
  id: number;
  taskId: number;
  userId: string;
  role: TaskRole;
  startDate: Date | null;
  endDate: Date | null;
  allocatedHours: number | null;
  allocatedPercentage: number | null;
  actualHours: number | null;
}

export interface CalendarResource {
  id: string;
  title: string;
  extendedProps: {
    user: {
      id: string;
      name: string | null;
      email: string;
      image?: string | null;
    };
    teamMemberId?: number;
  };
}

export interface CalendarEvent {
  id: string;
  resourceId: string;
  start: Date;
  end: Date;
  title: string;
  backgroundColor?: string;
  textColor?: string;
  extendedProps: {
    allocation: CalendarAllocation;
    teamMemberId: number;
  };
}
