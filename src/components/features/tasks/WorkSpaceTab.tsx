'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { Button, Card, LoadingSpinner, Banner } from '@/components/ui';
import { getToolComponent } from '@/components/tools/ToolRegistry';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Tool {
  id: number;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  componentPath: string;
  ToolSubTab?: {
    id: number;
    name: string;
    code: string;
    icon?: string;
    sortOrder: number;
  }[];
}

interface TaskTool {
  id: number;
  taskId: number;
  toolId: number;
  sortOrder: number;
  Tool: Tool;
}

interface WorkSpaceTabProps {
  taskId: string;
  subServiceLineGroup: string;
  initialNoteId?: number;
}

export function WorkSpaceTab({ taskId, subServiceLineGroup, initialNoteId }: WorkSpaceTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeToolId, setActiveToolId] = useState<number | null>(null);
  const [toolToRemove, setToolToRemove] = useState<{ id: number; name: string } | null>(null);
  const queryClient = useQueryClient();

  // Fetch tools assigned to this task
  const {
    data: taskTools = [],
    isLoading: loadingTaskTools,
  } = useQuery<TaskTool[]>({
    queryKey: ['task-tools', taskId],
    queryFn: async () => {
      const response = await fetch(`/api/tools/task/${taskId}`);
      if (!response.ok) throw new Error('Failed to fetch task tools');
      const result = await response.json();
      return result.data || [];
    },
  });

  // Initialize active tool to first tool when taskTools loads
  // If initialNoteId is provided, auto-select Review Notebook tool
  useEffect(() => {
    if (taskTools.length > 0 && activeToolId === null) {
      // If initialNoteId provided, find and select Review Notebook tool
      if (initialNoteId) {
        const reviewNotebookTool = taskTools.find(
          (tt) => tt.Tool.code === 'review-notebook'
        );
        if (reviewNotebookTool) {
          setActiveToolId(reviewNotebookTool.toolId);
          return;
        }
      }
      
      // Otherwise, select first tool
      if (taskTools[0]) {
        setActiveToolId(taskTools[0].toolId);
      }
    }
  }, [taskTools, activeToolId, initialNoteId]);

  // Fetch available tools for this sub-service line group
  const {
    data: availableTools = [],
    isLoading: loadingAvailable,
  } = useQuery<Tool[]>({
    queryKey: ['available-tools', subServiceLineGroup],
    queryFn: async () => {
      const response = await fetch(`/api/tools/available?subServiceLineGroup=${subServiceLineGroup}`);
      if (!response.ok) throw new Error('Failed to fetch available tools');
      const result = await response.json();
      return result.data || [];
    },
    enabled: showAddModal,
  });

  // Add tool to task
  const addToolMutation = useMutation({
    mutationFn: async (toolId: number) => {
      const response = await fetch(`/api/tools/task/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId }),
      });
      if (!response.ok) throw new Error('Failed to add tool');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-tools', taskId] });
      setShowAddModal(false);
      // Auto-select newly added tool
      if (data?.data?.toolId) {
        setActiveToolId(data.data.toolId);
      }
    },
  });

  // Remove tool from task
  const removeToolMutation = useMutation({
    mutationFn: async (toolId: number) => {
      const response = await fetch(`/api/tools/task/${taskId}?toolId=${toolId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove tool');
      return response.json();
    },
    onSuccess: (_, removedToolId) => {
      queryClient.invalidateQueries({ queryKey: ['task-tools', taskId] });
      // If removed tool was active, switch to first remaining tool
      if (activeToolId === removedToolId) {
        const remainingTools = taskTools.filter(tt => tt.toolId !== removedToolId);
        setActiveToolId(remainingTools.length > 0 && remainingTools[0] ? remainingTools[0].toolId : null);
      }
    },
  });

  const handleAddTool = (toolId: number) => {
    addToolMutation.mutate(toolId);
  };

  const handleRemoveTool = (toolId: number, toolName: string) => {
    setToolToRemove({ id: toolId, name: toolName });
  };

  const confirmRemoveTool = () => {
    if (toolToRemove) {
      removeToolMutation.mutate(toolToRemove.id);
      setToolToRemove(null);
    }
  };

  const cancelRemoveTool = () => {
    setToolToRemove(null);
  };

  // Filter out already assigned tools
  const unassignedTools = availableTools.filter(
    (tool) => !taskTools.some((tt) => tt.toolId === tool.id)
  );

  if (loadingTaskTools) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-forvis-gray-900">Work Space</h2>
          <p className="text-sm text-forvis-gray-600 mt-1">
            Add and manage tools for this task
          </p>
        </div>
        <Button
          variant="gradient"
          size="md"
          onClick={() => setShowAddModal(true)}
          icon={<Plus className="w-5 h-5" />}
        >
          Add Tool
        </Button>
      </div>

      {taskTools.length === 0 ? (
        <Card variant="standard" className="p-12 text-center">
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">No Tools Added</h3>
            <p className="text-sm text-forvis-gray-600 mb-4">
              Get started by adding a tool to this task. Tools help you organize and complete your work.
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={() => setShowAddModal(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Your First Tool
            </Button>
          </div>
        </Card>
      ) : (
        <Card variant="standard" className="overflow-hidden">
          {/* Tab Bar */}
          <div className="flex items-center gap-1 px-4 pt-4 border-b border-forvis-gray-200 overflow-x-auto scrollbar-thin">
            {taskTools.map((taskTool) => {
              const isActive = activeToolId === taskTool.toolId;
              return (
                <button
                  key={taskTool.id}
                  onClick={() => setActiveToolId(taskTool.toolId)}
                  className={`
                    group relative flex items-center gap-2 px-4 py-3 rounded-t-lg transition-all duration-200 min-w-fit whitespace-nowrap
                    ${isActive
                      ? 'bg-gradient-to-r from-forvis-blue-500 to-forvis-blue-600 text-white shadow-md'
                      : 'bg-forvis-gray-50 text-forvis-gray-700 hover:bg-forvis-blue-50 hover:text-forvis-blue-700'
                    }
                  `}
                >
                  <span className="text-sm font-medium">{taskTool.Tool.name}</span>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!removeToolMutation.isPending) {
                        handleRemoveTool(taskTool.toolId, taskTool.Tool.name);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!removeToolMutation.isPending) {
                          handleRemoveTool(taskTool.toolId, taskTool.Tool.name);
                        }
                      }
                    }}
                    className={`
                      p-1 rounded transition-colors cursor-pointer
                      ${isActive
                        ? 'hover:bg-white/20 text-white'
                        : 'hover:bg-forvis-error-100 text-forvis-gray-500 hover:text-forvis-error-600'
                      }
                      ${removeToolMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    title="Remove tool"
                    aria-label="Remove tool"
                  >
                    {removeToolMutation.isPending && activeToolId === taskTool.toolId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </div>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Tool Content */}
          <div className="p-6">
            {(() => {
              const activeTool = taskTools.find(tt => tt.toolId === activeToolId);
              if (!activeTool) {
                return (
                  <div className="text-center py-12">
                    <p className="text-sm text-forvis-gray-600">No tool selected</p>
                  </div>
                );
              }

              const ToolComponent = getToolComponent(activeTool.Tool.code);
              
              return ToolComponent ? (
                <ToolComponent 
                  taskId={taskId}
                  toolId={activeTool.toolId}
                  subTabs={activeTool.Tool.ToolSubTab}
                  initialNoteId={initialNoteId}
                />
              ) : (
                <Banner
                  variant="warning"
                  title="Tool Not Available"
                  message={`The tool "${activeTool.Tool.code}" is not registered in the system. Please ensure the tool component is properly registered.`}
                />
              );
            })()}
          </div>
        </Card>
      )}

      {/* Add Tool Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full p-6 bg-white rounded-lg shadow-corporate-lg space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-forvis-gray-900">Add Tool</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-forvis-gray-600 hover:text-forvis-gray-900 rounded-lg hover:bg-forvis-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingAvailable ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="md" />
              </div>
            ) : unassignedTools.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-forvis-gray-600">
                  No additional tools available for this service line.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {unassignedTools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => handleAddTool(tool.id)}
                    disabled={addToolMutation.isPending}
                    className="p-4 border-2 border-forvis-gray-200 rounded-lg hover:border-forvis-blue-500 hover:bg-forvis-blue-50 transition-all text-left"
                  >
                    <h3 className="text-base font-semibold text-forvis-gray-900 mb-1">
                      {tool.name}
                    </h3>
                    {tool.description && (
                      <p className="text-sm text-forvis-gray-600">{tool.description}</p>
                    )}
                    {tool.ToolSubTab && tool.ToolSubTab.length > 0 && (
                      <p className="text-xs text-forvis-gray-500 mt-2">
                        {tool.ToolSubTab.length} sub-tab{tool.ToolSubTab.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button variant="secondary" size="md" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Tool Confirmation Modal */}
      {toolToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-corporate-lg space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-forvis-error-100 flex items-center justify-center">
                <X className="w-5 h-5 text-forvis-error-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-forvis-gray-900">Remove Tool</h2>
                <p className="text-sm text-forvis-gray-600 mt-1">
                  Are you sure you want to remove <span className="font-semibold">{toolToRemove.name}</span> from this task? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                variant="secondary" 
                size="md" 
                onClick={cancelRemoveTool}
                disabled={removeToolMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                variant="danger" 
                size="md" 
                onClick={confirmRemoveTool}
                disabled={removeToolMutation.isPending}
                icon={removeToolMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
              >
                {removeToolMutation.isPending ? 'Removing...' : 'Remove Tool'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





