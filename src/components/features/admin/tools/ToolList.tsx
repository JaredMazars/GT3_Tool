'use client';

import { useState } from 'react';
import { Settings, Loader2 } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Tool {
  id: number;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  active: boolean;
  sortOrder: number;
  subTabs: Array<{
    id: number;
    name: string;
    code: string;
  }>;
  serviceLines: Array<{
    id: number;
    subServiceLineGroup: string;
    active: boolean;
  }>;
  _count: {
    tasks: number;
    subTabs: number;
    serviceLines: number;
  };
}

interface ToolListProps {
  onManageAssignments: (tool: Tool) => void;
}

export function ToolList({ onManageAssignments }: ToolListProps) {
  const queryClient = useQueryClient();

  // Fetch tools
  const {
    data: tools = [],
    isLoading,
  } = useQuery<Tool[]>({
    queryKey: ['tools'],
    queryFn: async () => {
      const response = await fetch('/api/tools');
      if (!response.ok) throw new Error('Failed to fetch tools');
      const result = await response.json();
      return result.data || [];
    },
  });

  // Toggle tool active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ toolId, active }: { toolId: number; active: boolean }) => {
      const response = await fetch(`/api/tools/${toolId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      if (!response.ok) throw new Error('Failed to update tool');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
    },
  });

  const handleToggleActive = (toolId: number, currentActive: boolean) => {
    toggleActiveMutation.mutate({ toolId, active: !currentActive });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-forvis-blue-600" />
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <Card variant="standard" className="p-12 text-center">
        <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">No Tools Found</h3>
        <p className="text-sm text-forvis-gray-600">
          No tools have been created yet. Tools will appear here once they are added.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {tools.map((tool) => {
        // Get unique SubServiceLineGroups
        const assignedGroups = [...new Set(tool.serviceLines.map((sl) => sl.subServiceLineGroup))];

        return (
          <Card key={tool.id} variant="standard" className="overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-forvis-gray-900">{tool.name}</h3>
                    {!tool.active && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-forvis-gray-200 text-forvis-gray-700">
                        Inactive
                      </span>
                    )}
                  </div>
                  {tool.description && (
                    <p className="text-sm text-forvis-gray-600 mb-3">{tool.description}</p>
                  )}
                  <div className="flex items-center space-x-4 text-sm text-forvis-gray-600">
                    <span>{tool._count.subTabs} sub-tab{tool._count.subTabs !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>{assignedGroups.length} sub-group{assignedGroups.length !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>{tool._count.tasks} task{tool._count.tasks !== 1 ? 's' : ''}</span>
                  </div>
                  {assignedGroups.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {assignedGroups.slice(0, 5).map((group) => (
                        <span
                          key={group}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-forvis-blue-50 text-forvis-blue-700 border border-forvis-blue-200"
                        >
                          {group}
                        </span>
                      ))}
                      {assignedGroups.length > 5 && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-forvis-gray-100 text-forvis-gray-700">
                          +{assignedGroups.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onManageAssignments(tool)}
                    icon={<Settings className="w-4 h-4" />}
                  >
                    Manage
                  </Button>
                  <Button
                    variant={tool.active ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={() => handleToggleActive(tool.id, tool.active)}
                    disabled={toggleActiveMutation.isPending}
                  >
                    {toggleActiveMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : tool.active ? (
                      'Deactivate'
                    ) : (
                      'Activate'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
