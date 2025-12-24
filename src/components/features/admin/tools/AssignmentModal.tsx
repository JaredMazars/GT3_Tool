'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Check } from 'lucide-react';
import { Button, LoadingSpinner } from '@/components/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Tool {
  id: number;
  name: string;
  description?: string;
}

interface SubServiceLineGroup {
  code: string;
  description: string;
}

interface GroupedSubServiceLines {
  masterCode: string;
  masterName: string;
  masterDescription: string | null;
  groups: SubServiceLineGroup[];
}

interface AssignmentModalProps {
  tool: Tool;
  isOpen: boolean;
  onClose: () => void;
}

export function AssignmentModal({ tool, isOpen, onClose }: AssignmentModalProps) {
  const queryClient = useQueryClient();
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all SubServiceLineGroups
  const {
    data: groupedSubServiceLines = [],
    isLoading: loadingGroups,
  } = useQuery<GroupedSubServiceLines[]>({
    queryKey: ['sub-service-line-groups'],
    queryFn: async () => {
      const response = await fetch('/api/admin/sub-service-line-groups');
      if (!response.ok) throw new Error('Failed to fetch sub-service line groups');
      const result = await response.json();
      return result.data || [];
    },
    enabled: isOpen,
  });

  // Fetch current assignments
  const {
    data: currentAssignments,
    isLoading: loadingAssignments,
  } = useQuery<{ tool: Tool; assignments: string[] }>({
    queryKey: ['tool-assignments', tool.id],
    queryFn: async () => {
      const response = await fetch(`/api/tools/${tool.id}/assignments`);
      if (!response.ok) throw new Error('Failed to fetch tool assignments');
      const result = await response.json();
      return result.data;
    },
    enabled: isOpen,
  });

  // Initialize selected groups when assignments load
  useEffect(() => {
    if (currentAssignments?.assignments) {
      setSelectedGroups(new Set(currentAssignments.assignments));
    }
  }, [currentAssignments]);

  // Update assignments mutation
  const updateAssignmentsMutation = useMutation({
    mutationFn: async (subServiceLineGroups: string[]) => {
      const response = await fetch(`/api/tools/${tool.id}/assignments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subServiceLineGroups }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update assignments');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      queryClient.invalidateQueries({ queryKey: ['tool-assignments', tool.id] });
      onClose();
    },
  });

  const handleToggleGroup = (groupCode: string) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupCode)) {
      newSelected.delete(groupCode);
    } else {
      newSelected.add(groupCode);
    }
    setSelectedGroups(newSelected);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateAssignmentsMutation.mutateAsync(Array.from(selectedGroups));
    } catch (error) {
      console.error('Failed to update assignments:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const isLoading = loadingGroups || loadingAssignments;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="max-w-3xl w-full p-6 bg-white rounded-lg shadow-corporate-lg space-y-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-xl font-semibold text-forvis-gray-900">Manage Tool Assignments</h2>
            <p className="text-sm text-forvis-gray-600 mt-1">Tool: {tool.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-forvis-gray-600 hover:text-forvis-gray-900 rounded-lg hover:bg-forvis-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-sm text-forvis-gray-700">
                Select which sub-service line groups can access this tool:
              </p>

              {groupedSubServiceLines.map((master) => (
                <div key={master.masterCode} className="space-y-3">
                  <h3 className="text-base font-semibold text-forvis-gray-900">
                    {master.masterName}
                    {master.masterDescription && (
                      <span className="ml-2 text-sm font-normal text-forvis-gray-600">
                        {master.masterDescription}
                      </span>
                    )}
                  </h3>
                  <div className="space-y-2 pl-4">
                    {master.groups.map((group) => {
                      const isSelected = selectedGroups.has(group.code);
                      return (
                        <button
                          key={group.code}
                          onClick={() => handleToggleGroup(group.code)}
                          className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-forvis-blue-50 transition-colors border border-forvis-gray-200"
                        >
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                              isSelected
                                ? 'bg-forvis-blue-600 border-forvis-blue-600'
                                : 'border-forvis-gray-300'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 text-left">
                            <span className="font-medium text-forvis-gray-900">{group.code}</span>
                            <span className="ml-2 text-sm text-forvis-gray-600">{group.description}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {groupedSubServiceLines.length === 0 && (
                <p className="text-sm text-forvis-gray-600 text-center py-8">
                  No sub-service line groups found.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-forvis-gray-600">
            {selectedGroups.size} group{selectedGroups.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="secondary" size="md" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSave}
              disabled={isSaving || isLoading}
              loading={isSaving}
            >
              Save ({selectedGroups.size})
            </Button>
          </div>
        </div>

        {/* Error message */}
        {updateAssignmentsMutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              {updateAssignmentsMutation.error instanceof Error
                ? updateAssignmentsMutation.error.message
                : 'Failed to update assignments'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}








