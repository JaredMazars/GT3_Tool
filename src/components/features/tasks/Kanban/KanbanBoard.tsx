'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { LayoutGrid, List, Maximize2, Minimize2 } from 'lucide-react';
import { KanbanBoardProps, KanbanTask, KanbanFilters, CardDisplayMode } from './types';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { KanbanFilters as KanbanFiltersComponent } from './KanbanFilters';
import { useKanbanBoard, useUpdateTaskStage, kanbanKeys } from '@/hooks/tasks/useKanbanBoard';
import { useQueryClient } from '@tanstack/react-query';
import { KanbanBoardData } from './types';
import { LoadingSpinner } from '@/components/ui';
import { TaskStage } from '@/types/task-stages';
import { TaskDetailModal } from '@/components/features/tasks/TaskDetail/TaskDetailModal';

export function KanbanBoard({
  serviceLine,
  subServiceLineGroup,
  myTasksOnly = false,
  onTaskClick,
  displayMode: externalDisplayMode,
  onDisplayModeChange,
}: KanbanBoardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  
  const [filters, setFilters] = useState<KanbanFilters>({
    search: '',
    teamMembers: [],
    partners: [],
    managers: [],
    clients: [],
    includeArchived: false,
  });
  const [internalDisplayMode, setInternalDisplayMode] = useState<CardDisplayMode>('detailed');
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  
  // Use external display mode if provided, otherwise use internal state
  const displayMode = externalDisplayMode ?? internalDisplayMode;
  const setDisplayMode = onDisplayModeChange ?? setInternalDisplayMode;
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Fetch Kanban data
  const { data, isLoading, isFetching, error, refetch } = useKanbanBoard({
    serviceLine,
    subServiceLineGroup,
    myTasksOnly,
    search: filters.search,
    teamMembers: filters.teamMembers,
    partners: filters.partners,
    managers: filters.managers,
    clients: filters.clients,
    includeArchived: filters.includeArchived, // Query will refetch when this changes
  });

  // Check for taskModal URL parameter and open modal if present
  useEffect(() => {
    const taskModalId = searchParams.get('taskModal');
    if (taskModalId) {
      setSelectedTaskId(taskModalId);
      setIsModalOpen(true);
    }
  }, [searchParams]);

  // Update task stage mutation
  const updateStageMutation = useUpdateTaskStage();

  // Check if user can drag (has EDITOR, REVIEWER role or higher on at least one task)
  const canDrag = useMemo(() => {
    if (!data?.columns) return false;
    
    return data.columns.some(column =>
      column.tasks.some(task => 
        task.userRole && ['ADMIN', 'REVIEWER', 'EDITOR'].includes(task.userRole)
      )
    );
  }, [data]);

  // Get unique team members for filter
  const teamMembers = useMemo(() => {
    if (!data?.columns) return [];
    
    const membersMap = new Map<string, { id: string; name: string }>();
    
    data.columns.forEach(column => {
      column.tasks.forEach(task => {
        task.team.forEach(member => {
          if (!membersMap.has(member.userId)) {
            membersMap.set(member.userId, {
              id: member.userId,
              name: member.name || member.email,
            });
          }
        });
      });
    });
    
    return Array.from(membersMap.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    );
  }, [data]);

  // Get unique partners for filter
  const partners = useMemo(() => {
    if (!data?.columns) return [];
    
    const partnersSet = new Set<string>();
    
    data.columns.forEach(column => {
      column.tasks.forEach(task => {
        if (task.partner) {
          partnersSet.add(task.partner);
        }
      });
    });
    
    return Array.from(partnersSet).sort();
  }, [data]);

  // Get unique managers for filter
  const managers = useMemo(() => {
    if (!data?.columns) return [];
    
    const managersSet = new Set<string>();
    
    data.columns.forEach(column => {
      column.tasks.forEach(task => {
        if (task.manager) {
          managersSet.add(task.manager);
        }
      });
    });
    
    return Array.from(managersSet).sort();
  }, [data]);

  // Get unique clients for filter
  const clients = useMemo(() => {
    if (!data?.columns) return [];
    
    const clientsMap = new Map<number, { id: number; code: string; name: string }>();
    
    data.columns.forEach(column => {
      column.tasks.forEach(task => {
        if (task.client && !clientsMap.has(task.client.id)) {
          clientsMap.set(task.client.id, {
            id: task.client.id,
            code: task.client.code,
            name: task.client.name || 'Unknown Client',
          });
        }
      });
    });
    
    return Array.from(clientsMap.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    );
  }, [data]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before activating drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const taskId = Number(active.id);
    
    // Find the task being dragged
    const task = data?.columns
      .flatMap(col => col.tasks)
      .find(t => t.id === taskId);
    
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveTask(null);
      return;
    }

    const taskId = Number(active.id);
    const newStage = over.id as TaskStage;
    
    // Prevent dragging to ARCHIVED column
    if (newStage === TaskStage.ARCHIVED) {
      setActiveTask(null);
      return;
    }

    // Find the task
    const task = data?.columns
      .flatMap(col => col.tasks)
      .find(t => t.id === taskId);

    if (!task) {
      setActiveTask(null);
      return;
    }

    // Check if stage actually changed
    if (task.stage === newStage) {
      setActiveTask(null);
      return;
    }

    // Check if user has permission to move this task
    // ADMIN, REVIEWER, and EDITOR can all move tasks
    if (!task.userRole || !['ADMIN', 'REVIEWER', 'EDITOR'].includes(task.userRole)) {
      setActiveTask(null);
      return;
    }

    const mutationParams = { taskId, stage: newStage };

    // SYNCHRONOUSLY update cache BEFORE mutation to prevent visual jump
    // This ensures the UI updates immediately when drag ends
    queryClient.setQueriesData<KanbanBoardData>(
      { queryKey: kanbanKeys.boards() },
      (old) => {
        if (!old) return old;
        
        // Move task to new column
        const updatedColumns = old.columns.map(column => {
          const filteredTasks = column.tasks.filter(t => t.id !== taskId);
          
          if (column.stage === newStage) {
            const taskToMove = old.columns
              .flatMap(col => col.tasks)
              .find(t => t.id === taskId);
            
            if (taskToMove) {
              const newTasks = [...filteredTasks, { ...taskToMove, stage: newStage }];
              const newTaskCount = newTasks.length;
              const newLoaded = column.metrics.loaded !== undefined
                ? Math.min(newTaskCount, column.totalCount)
                : newTaskCount;
              
              return {
                ...column,
                tasks: newTasks,
                taskCount: newTaskCount,
                totalCount: column.totalCount,
                metrics: { 
                  count: column.metrics.count,
                  loaded: newLoaded,
                },
              };
            }
          }
          
          if (filteredTasks.length !== column.tasks.length) {
            const newTaskCount = filteredTasks.length;
            const newLoaded = column.metrics.loaded !== undefined
              ? Math.min(newTaskCount, column.totalCount)
              : newTaskCount;
              
            return {
              ...column,
              tasks: filteredTasks,
              taskCount: newTaskCount,
              totalCount: column.totalCount,
              metrics: { 
                count: column.metrics.count,
                loaded: newLoaded,
              },
            };
          }
          
          return column;
        });
        
        return { 
          ...old, 
          columns: updatedColumns,
          totalTasks: old.totalTasks,
          loadedTasks: old.loadedTasks,
        };
      }
    );

    // Trigger mutation for server sync (without optimistic update since we already did it)
    updateStageMutation.mutate(mutationParams);
    
    // Clear overlay immediately - cache is already updated
    setActiveTask(null);
  };

  const toggleColumnCollapse = (stage: string) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(stage)) {
        next.delete(stage);
      } else {
        next.add(stage);
      }
      return next;
    });
  };

  const handleTaskClick = (taskId: number) => {
    if (onTaskClick) {
      onTaskClick(taskId);
    } else {
      // Open modal with URL parameter
      setSelectedTaskId(taskId.toString());
      setIsModalOpen(true);
      
      // Update URL with taskModal parameter (shallow routing)
      const params = new URLSearchParams(searchParams.toString());
      params.set('taskModal', taskId.toString());
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTaskId(null);
    
    // Remove taskModal parameter from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete('taskModal');
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
    
    // Refresh kanban board data
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-medium">Error loading Kanban board</p>
        <p className="text-sm mt-1">Please try again later.</p>
      </div>
    );
  }

  if (!data || data.columns.length === 0) {
    return (
      <div className="bg-forvis-gray-50 border border-forvis-gray-200 rounded-lg p-8 text-center">
        <p className="text-forvis-gray-600">No tasks found</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <KanbanFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          teamMembers={teamMembers}
          partners={partners}
          managers={managers}
          clients={clients}
        />

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div 
            className="pb-4" 
            style={{ 
              maxHeight: 'calc(100vh - 300px)',
              overflow: 'hidden'
            }}
          >
            <div className="flex gap-3 h-full w-full">
              {data.columns.map(column => (
                <KanbanColumn
                  key={column.stage}
                  column={column}
                  isCollapsed={collapsedColumns.has(column.stage)}
                  onToggleCollapse={() => toggleColumnCollapse(column.stage)}
                  canDrag={canDrag && column.stage !== TaskStage.ARCHIVED}
                  displayMode={displayMode}
                  onTaskClick={handleTaskClick}
                />
              ))}
            </div>
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeTask ? (
              <div className="opacity-80">
                <KanbanCard
                  task={activeTask}
                  displayMode={displayMode}
                  canDrag={false}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task Detail Modal */}
      {isModalOpen && selectedTaskId && (
        <TaskDetailModal
          isOpen={isModalOpen}
          taskId={selectedTaskId}
          onClose={handleCloseModal}
          serviceLine={serviceLine}
          subServiceLineGroup={subServiceLineGroup}
          onTaskUpdated={refetch}
        />
      )}
    </>
  );
}



