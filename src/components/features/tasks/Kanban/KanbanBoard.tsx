'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  closestCenter,
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
import { hasServiceLineRole } from '@/lib/utils/roleHierarchy';

export function KanbanBoard({
  serviceLine,
  subServiceLineGroup,
  myTasksOnly = false,
  onTaskClick,
  displayMode: externalDisplayMode,
  onDisplayModeChange,
  filters,
}: KanbanBoardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  
  const [internalDisplayMode, setInternalDisplayMode] = useState<CardDisplayMode>('detailed');
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  
  // Use external display mode if provided, otherwise use internal state
  const displayMode = externalDisplayMode ?? internalDisplayMode;
  const setDisplayMode = onDisplayModeChange ?? setInternalDisplayMode;
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Fetch Kanban data - pass new filter structure
  const { data, isLoading, isFetching, error, refetch } = useKanbanBoard({
    serviceLine,
    subServiceLineGroup,
    myTasksOnly,
    clientIds: filters.clients,
    taskNames: filters.taskNames,
    partnerCodes: filters.partners,
    managerCodes: filters.managers,
    serviceLineCodes: filters.serviceLines,
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

  // Check if user can drag
  // For myTasksOnly view: allow if user is involved with any task (partner/manager/team member)
  // For all tasks view: require SUPERVISOR role or higher
  const canDrag = useMemo(() => {
    if (!data?.columns) return false;
    
    return data.columns.some(column =>
      column.tasks.some(task => {
        // In My Tasks view, allow drag if user is involved with the task
        if (myTasksOnly && task.isUserInvolved) {
          return true;
        }
        // Otherwise, require SUPERVISOR role or higher
        return task.userRole && hasServiceLineRole(task.userRole, 'SUPERVISOR');
      })
    );
  }, [data, myTasksOnly]);

  // Filter options are now provided by parent through TasksFilters component
  // No need for client-side extraction

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

    // Validation 1: Ensure we have a valid drop target
    // If user drops outside any droppable area, keep task in original position
    if (!over) {
      setActiveTask(null);
      return;
    }

    const taskId = Number(active.id);
    
    // Validation 2: Resolve the drop target
    // The drop target can be either a column droppable area (TaskStage ID)
    // or a task card (task ID). We need to determine which and extract the stage.
    let newStage: TaskStage;
    
    // Check if over.id is a valid TaskStage enum value
    const validStages = Object.values(TaskStage);
    if (validStages.includes(over.id as TaskStage)) {
      // Case A: Dropped directly on a column droppable area
      newStage = over.id as TaskStage;
    } else {
      // Case B: Dropped on a task card - find which column that task belongs to
      // This allows users to drop tasks on other tasks to move them to the same column
      const targetTaskId = Number(over.id);
      const targetTask = data?.columns
        .flatMap(col => col.tasks)
        .find(t => t.id === targetTaskId);
      
      if (!targetTask) {
        // Edge case: Invalid or stale task ID - keep task in original position
        setActiveTask(null);
        return;
      }
      
      newStage = targetTask.stage;
    }
    
    // Validation 3: Prevent moves to ARCHIVED column
    // Tasks can only be archived through explicit actions, not drag-and-drop
    if (newStage === TaskStage.ARCHIVED) {
      setActiveTask(null);
      return;
    }

    // Validation 4: Verify the task being dragged exists in current data
    const task = data?.columns
      .flatMap(col => col.tasks)
      .find(t => t.id === taskId);

    if (!task) {
      setActiveTask(null);
      return;
    }

    // Validation 5: Skip update if stage hasn't changed
    // Prevents unnecessary API calls and cache updates
    if (task.stage === newStage) {
      setActiveTask(null);
      return;
    }

    // Validation 6: Check user permissions
    // In My Tasks view: allow if user is involved with the task (partner/manager/team member)
    // In all tasks view: require SUPERVISOR role or higher
    const canMoveTask = myTasksOnly 
      ? task.isUserInvolved 
      : (task.userRole && hasServiceLineRole(task.userRole, 'SUPERVISOR'));
    
    if (!canMoveTask) {
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
              const newTasks = [{ ...taskToMove, stage: newStage }, ...filteredTasks];
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
                  count: newTaskCount, // Update count to reflect new task count
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
                count: newTaskCount, // Update count to reflect new task count
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
        {/* Filters are now managed by parent TasksFilters component */}

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
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
              {data.columns.map(column => {
                // In My Tasks view, allow dragging from ARCHIVED if user is involved with tasks
                // Otherwise, disable dragging from ARCHIVED column
                const columnCanDrag = column.stage === TaskStage.ARCHIVED
                  ? canDrag && myTasksOnly // Only allow in My Tasks view
                  : canDrag;
                
                return (
                  <KanbanColumn
                    key={column.stage}
                    column={column}
                    isCollapsed={collapsedColumns.has(column.stage)}
                    onToggleCollapse={() => toggleColumnCollapse(column.stage)}
                    canDrag={columnCanDrag}
                    myTasksOnly={myTasksOnly}
                    displayMode={displayMode}
                    onTaskClick={handleTaskClick}
                  />
                );
              })}
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



