import { TaskStage } from '@/types/task-stages';
import { EmployeeStatus } from '@/types';

export interface KanbanTask {
  id: number;
  name: string;
  code: string;
  serviceLine: string;
  serviceLineDesc: string;
  stage: TaskStage;
  partner: string;
  manager: string;
  partnerStatus?: EmployeeStatus; // Employee status for partner
  managerStatus?: EmployeeStatus; // Employee status for manager
  dateOpen: Date | string;
  dateTerminate: Date | string | null;
  client: {
    id: number;
    GSClientID: string;
    code: string;
    name: string | null;
  } | null;
  team: {
    userId: string;
    role: string;
    name: string | null;
    email: string;
    employeeStatus?: EmployeeStatus; // Employee status for team member
  }[];
  userRole: string | null;
  isUserInvolved: boolean; // True if user is partner, manager, or team member
  wip?: {
    netWip: number;
  } | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  acceptanceApproved?: boolean | null; // A&C approval status
  engagementLetterUploaded?: boolean | null; // EL upload status
  dpaUploaded?: boolean | null; // DPA upload status
  isClientTask: boolean; // Whether this is a client task (determines A&C/EL/DPA visibility)
}

export interface KanbanColumn {
  stage: TaskStage;
  name: string;
  taskCount: number;        // Loaded tasks count
  totalCount: number;       // Database total count (accurate)
  tasks: KanbanTask[];
  metrics: {
    count: number;          // Display this (accurate database total)
    loaded?: number;        // Optional: how many tasks actually loaded
  };
}

export interface KanbanBoardData {
  columns: KanbanColumn[];
  totalTasks: number;       // Accurate database total
  loadedTasks?: number;     // Optional: how many tasks actually loaded
}

export interface KanbanFilters {
  search: string;
  clients: number[];
  tasks: string[];
  partners: string[];
  managers: string[];
  includeArchived: boolean;
}

export type CardDisplayMode = 'compact' | 'detailed';

export interface TasksFiltersType {
  clients: number[];
  taskNames: string[];
  partners: string[];
  managers: string[];
  serviceLines: string[];
  includeArchived: boolean;
}

export interface KanbanBoardProps {
  serviceLine: string;
  subServiceLineGroup: string;
  myTasksOnly?: boolean;
  onTaskClick?: (taskId: number) => void;
  displayMode?: CardDisplayMode;
  onDisplayModeChange?: (mode: CardDisplayMode) => void;
  filters: TasksFiltersType; // Required - filters now managed by parent
}

export interface KanbanColumnProps {
  column: KanbanColumn;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  canDrag: boolean;
  myTasksOnly: boolean;
  displayMode: CardDisplayMode;
  onTaskClick?: (taskId: number) => void;
}

export interface KanbanCardProps {
  task: KanbanTask;
  displayMode: CardDisplayMode;
  canDrag: boolean;
  onClick?: () => void;
}

export interface KanbanFiltersProps {
  filters: KanbanFilters;
  onFiltersChange: (filters: KanbanFilters) => void;
  clients: { id: number; code: string; name: string }[];
  tasks: string[];
  partners: string[];
  managers: string[];
  viewMode?: 'list' | 'kanban';
  onViewModeChange?: (mode: 'list' | 'kanban') => void;
  displayMode?: CardDisplayMode;
  onDisplayModeChange?: (mode: CardDisplayMode) => void;
  showSearch?: boolean;
}

export interface KanbanMetricsProps {
  metrics: {
    count: number;
    loaded?: number;
  };
  myTasksOnly?: boolean;
}




