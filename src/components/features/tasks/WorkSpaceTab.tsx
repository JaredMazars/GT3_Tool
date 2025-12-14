'use client';

import { useState } from 'react';
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
  subTabs?: {
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
  tool: Tool;
}

interface WorkSpaceTabProps {
  taskId: string;
  subServiceLineGroup: string;
}

export function WorkSpaceTab({ taskId, subServiceLineGroup }: WorkSpaceTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-tools', taskId] });
      setShowAddModal(false);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-tools', taskId] });
    },
  });

  const handleAddTool = (toolId: number) => {
    addToolMutation.mutate(toolId);
  };

  const handleRemoveTool = (toolId: number) => {
    if (confirm('Are you sure you want to remove this tool from the task?')) {
      removeToolMutation.mutate(toolId);
    }
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
        <div className="space-y-6">
          {taskTools.map((taskTool) => {
            const ToolComponent = getToolComponent(taskTool.tool.code);

            return (
              <Card key={taskTool.id} variant="standard" className="overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-forvis-blue-50 to-forvis-blue-100 border-b border-forvis-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-forvis-gray-900">
                        {taskTool.tool.name}
                      </h3>
                      {taskTool.tool.description && (
                        <p className="text-sm text-forvis-gray-600 mt-1">
                          {taskTool.tool.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveTool(taskTool.toolId)}
                      className="p-2 text-forvis-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove tool"
                      disabled={removeToolMutation.isPending}
                    >
                      {removeToolMutation.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <X className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {ToolComponent ? (
                    <ToolComponent taskId={taskId} />
                  ) : (
                    <Banner
                      variant="warning"
                      title="Tool Not Available"
                      message={`The tool "${taskTool.tool.code}" is not registered in the system.`}
                    />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
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
                    {tool.subTabs && tool.subTabs.length > 0 && (
                      <p className="text-xs text-forvis-gray-500 mt-2">
                        {tool.subTabs.length} sub-tab{tool.subTabs.length !== 1 ? 's' : ''}
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
    </div>
  );
}
