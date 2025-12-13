import { TaskStage } from '@/types/task-stages';

export interface KanbanTask {
  id: number;
  name: string;
  code: string;
  serviceLine: string;
  serviceLineDesc: string;
  stage: TaskStage;
  partner: string;
  manager: string;
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
  }[];
  userRole: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
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
  teamMembers: string[];
  partners: string[];
  managers: string[];
  clients: number[];
  includeArchived: boolean;
}

export type CardDisplayMode = 'compact' | 'detailed';

export interface KanbanBoardProps {
  serviceLine: string;
  subServiceLineGroup: string;
  myTasksOnly?: boolean;
  onTaskClick?: (taskId: number) => void;
  displayMode?: CardDisplayMode;
  onDisplayModeChange?: (mode: CardDisplayMode) => void;
}

export interface KanbanColumnProps {
  column: KanbanColumn;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  canDrag: boolean;
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
  teamMembers: { id: string; name: string }[];
  partners: string[];
  managers: string[];
  clients: { id: number; code: string; name: string }[];
}

export interface KanbanMetricsProps {
  metrics: {
    count: number;
  };
}




