'use client';

import { useState } from 'react';
import { Settings, Loader2, Plus, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, Button, Banner } from '@/components/ui';
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

interface RegisteredTool {
  code: string;
  name: string;
  description: string;
  version: string;
  defaultSubTabs: Array<{
    id: string;
    label: string;
    icon: string;
  }>;
  syncStatus: 'synced' | 'code_only' | 'db_only';
  dbToolId?: number;
  dbActive?: boolean;
}

interface RegisteredToolsResponse {
  registered: RegisteredTool[];
  orphaned: Array<{
    code: string;
    name: string;
    dbToolId: number;
    dbActive: boolean;
    syncStatus: 'db_only';
  }>;
}

interface ToolListProps {
  onManageAssignments: (tool: Tool) => void;
}

export function ToolList({ onManageAssignments }: ToolListProps) {
  const queryClient = useQueryClient();

  // Fetch registered tools from code
  const {
    data: registeredData,
    isLoading: loadingRegistered,
  } = useQuery<RegisteredToolsResponse>({
    queryKey: ['registered-tools'],
    queryFn: async () => {
      const response = await fetch('/api/tools/registered');
      if (!response.ok) throw new Error('Failed to fetch registered tools');
      const result = await response.json();
      return result.data || { registered: [], orphaned: [] };
    },
  });

  // Fetch tools from database
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

  // Register tool mutation
  const registerToolMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch('/api/tools/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to register tool');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      queryClient.invalidateQueries({ queryKey: ['registered-tools'] });
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

  const handleRegisterTool = (code: string) => {
    if (confirm(`Register "${code}" tool to database? This will create the tool and its sub-tabs.`)) {
      registerToolMutation.mutate(code);
    }
  };

  const unregisteredTools = registeredData?.registered.filter(
    (tool) => tool.syncStatus === 'code_only'
  ) || [];

  const orphanedTools = registeredData?.orphaned || [];

  if (isLoading || loadingRegistered) {
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
    <div className="space-y-6">
      {/* Registered Tools from Code */}
      {unregisteredTools.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-forvis-gray-900">Registered Tools from Code</h2>
              <p className="text-sm text-forvis-gray-600 mt-1">
                Tools available in code that need to be registered to the database
              </p>
            </div>
          </div>

          {unregisteredTools.map((tool) => (
            <Card key={tool.code} variant="standard" className="overflow-hidden border-2 border-forvis-blue-200">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-forvis-gray-900">{tool.name}</h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                        Code Only
                      </span>
                    </div>
                    {tool.description && (
                      <p className="text-sm text-forvis-gray-600 mb-3">{tool.description}</p>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-forvis-gray-600">
                      <span>Version: {tool.version}</span>
                      <span>•</span>
                      <span>{tool.defaultSubTabs.length} sub-tab{tool.defaultSubTabs.length !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span className="font-mono text-xs">{tool.code}</span>
                    </div>
                    {tool.defaultSubTabs.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {tool.defaultSubTabs.map((subTab) => (
                          <span
                            key={subTab.id}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-forvis-gray-50 text-forvis-gray-700 border border-forvis-gray-200"
                          >
                            {subTab.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleRegisterTool(tool.code)}
                      disabled={registerToolMutation.isPending}
                      icon={<Plus className="w-4 h-4" />}
                    >
                      {registerToolMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Register'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Orphaned Tools Warning */}
      {orphanedTools.length > 0 && (
        <Banner
          variant="warning"
          title="Orphaned Tools Detected"
          message={`${orphanedTools.length} tool(s) exist in the database but not in code. These may need attention.`}
        />
      )}

      {/* All Tools from Database */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-forvis-gray-900">All Tools</h2>
          <p className="text-sm text-forvis-gray-600 mt-1">
            Tools registered in the database and available for assignment
          </p>
        </div>

        {tools.length === 0 ? (
          <Card variant="standard" className="p-12 text-center">
            <h3 className="text-lg font-semibold text-forvis-gray-900 mb-2">No Tools Found</h3>
            <p className="text-sm text-forvis-gray-600">
              {unregisteredTools.length > 0
                ? 'Register tools from code above to get started.'
                : 'No tools have been created yet. Tools will appear here once they are added.'}
            </p>
          </Card>
        ) : (
          tools.map((tool) => {
            // Get unique SubServiceLineGroups
            const assignedGroups = [...new Set((tool.serviceLines || []).map((sl) => sl.subServiceLineGroup))];

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
          })
        )}
      </div>
    </div>
  );
}








