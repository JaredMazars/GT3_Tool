'use client';

import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { ServiceLine, ServiceLineRole } from '@/types';
import { SERVICE_LINE_DETAILS } from '@/types/service-line';

interface SubServiceLineGroup {
  code: string;
  description: string;
  activeTasks: number;
  totalTasks: number;
}

interface AddServiceLineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    type: 'main' | 'subgroup';
    masterCode?: string;
    subGroups?: string[];
    role: ServiceLineRole;
  }) => Promise<void>;
  existingServiceLines: string[]; // List of service lines/sub-groups user already has
}

export function AddServiceLineModal({
  isOpen,
  onClose,
  onSubmit,
  existingServiceLines,
}: AddServiceLineModalProps) {
  const [selectedServiceLine, setSelectedServiceLine] = useState<ServiceLine | null>(null);
  const [assignmentType, setAssignmentType] = useState<'main' | 'subgroup'>('main');
  const [selectedRole, setSelectedRole] = useState<ServiceLineRole>(ServiceLineRole.USER);
  const [subGroups, setSubGroups] = useState<SubServiceLineGroup[]>([]);
  const [selectedSubGroups, setSelectedSubGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSubGroups, setLoadingSubGroups] = useState(false);

  // Fetch sub-groups when a service line is selected and type is 'subgroup'
  useEffect(() => {
    if (selectedServiceLine && assignmentType === 'subgroup') {
      fetchSubGroups(selectedServiceLine);
    } else {
      setSubGroups([]);
      setSelectedSubGroups([]);
    }
  }, [selectedServiceLine, assignmentType]);

  const fetchSubGroups = async (masterCode: string) => {
    setLoadingSubGroups(true);
    try {
      // Use admin endpoint to get ALL sub-groups (not filtered by current user's access)
      // This allows admins to assign any sub-group to users, even ones they don't personally have
      const response = await fetch(`/api/admin/service-lines/${masterCode}/sub-groups`);
      if (response.ok) {
        const data = await response.json();
        setSubGroups(data.success ? data.data : []);
      }
    } catch (error) {
      console.error('Error fetching sub-groups:', error);
      setSubGroups([]);
    } finally {
      setLoadingSubGroups(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedServiceLine) return;

    setLoading(true);
    try {
      await onSubmit({
        type: assignmentType,
        masterCode: assignmentType === 'main' ? selectedServiceLine : undefined,
        subGroups: assignmentType === 'subgroup' ? selectedSubGroups : undefined,
        role: selectedRole,
      });
      handleClose();
    } catch (error) {
      console.error('Error adding service line:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedServiceLine(null);
    setAssignmentType('main');
    setSelectedRole(ServiceLineRole.USER);
    setSelectedSubGroups([]);
    setSubGroups([]);
    onClose();
  };

  const toggleSubGroup = (code: string) => {
    setSelectedSubGroups((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code]
    );
  };

  const isValid = () => {
    if (!selectedServiceLine) return false;
    if (assignmentType === 'subgroup' && selectedSubGroups.length === 0) return false;
    return true;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Add Service Line Access</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Step 1: Select Service Line */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              1. Select Service Line
            </label>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(ServiceLine).map((sl) => {
                const details = SERVICE_LINE_DETAILS[sl];
                const Icon = details.icon;
                const alreadyHasAccess = existingServiceLines.includes(sl);

                return (
                  <button
                    key={sl}
                    onClick={() => !alreadyHasAccess && setSelectedServiceLine(sl)}
                    disabled={alreadyHasAccess}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedServiceLine === sl
                        ? `${details.borderColorClass} ${details.bgColorClass} shadow-md`
                        : alreadyHasAccess
                        ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`h-6 w-6 ${details.colorClass}`} />
                      <div className="text-left flex-1">
                        <div className="font-semibold text-gray-900 text-sm">
                          {details.name}
                        </div>
                        {alreadyHasAccess && (
                          <div className="text-xs text-gray-500 mt-0.5">Has access</div>
                        )}
                      </div>
                      {selectedServiceLine === sl && (
                        <Check className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Assignment Type */}
          {selectedServiceLine && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                2. Assignment Type
              </label>
              <div className="space-y-3">
                <button
                  onClick={() => setAssignmentType('main')}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    assignmentType === 'main'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        All Sub-Groups (Main Service Line)
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Grant access to all sub-service line groups within {SERVICE_LINE_DETAILS[selectedServiceLine].name}.
                        User will automatically have access to any future sub-groups added.
                      </div>
                    </div>
                    {assignmentType === 'main' && (
                      <Check className="h-5 w-5 text-blue-600 ml-3 flex-shrink-0" />
                    )}
                  </div>
                </button>

                <button
                  onClick={() => setAssignmentType('subgroup')}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    assignmentType === 'subgroup'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        Specific Sub-Groups Only
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Grant access to selected sub-service line groups only. 
                        User will only see tasks within the selected sub-groups.
                      </div>
                    </div>
                    {assignmentType === 'subgroup' && (
                      <Check className="h-5 w-5 text-blue-600 ml-3 flex-shrink-0" />
                    )}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Select Sub-Groups (if type is 'subgroup') */}
          {selectedServiceLine && assignmentType === 'subgroup' && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                3. Select Sub-Groups
              </label>
              {loadingSubGroups ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded-lg" />
                  ))}
                </div>
              ) : subGroups.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-500 text-sm">
                    No sub-groups available for {SERVICE_LINE_DETAILS[selectedServiceLine].name}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {subGroups.map((subGroup) => {
                    const isSelected = selectedSubGroups.includes(subGroup.code);
                    return (
                      <button
                        key={subGroup.code}
                        onClick={() => toggleSubGroup(subGroup.code)}
                        className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 text-sm">
                              {subGroup.description || subGroup.code}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {subGroup.activeTasks} active • {subGroup.totalTasks} total tasks
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="h-5 w-5 text-blue-600 ml-3" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedSubGroups.length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  {selectedSubGroups.length} sub-group(s) selected
                </div>
              )}
            </div>
          )}

          {/* Step 4: Select Role */}
          {selectedServiceLine && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                {assignmentType === 'subgroup' && subGroups.length > 0 ? '4' : '3'}. Select Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as ServiceLineRole)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={ServiceLineRole.VIEWER}>Viewer - Read-only access</option>
                <option value={ServiceLineRole.USER}>User - Can work on assigned tasks</option>
                <option value={ServiceLineRole.SUPERVISOR}>Supervisor - Can create tasks and assign users</option>
                <option value={ServiceLineRole.MANAGER}>Manager - Full CRUD within service line</option>
                <option value={ServiceLineRole.PARTNER}>Partner - Full access across service lines</option>
                <option value={ServiceLineRole.ADMINISTRATOR}>Administrator - Full access + admin features</option>
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isValid() || loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Adding...' : 'Add Service Line Access'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
































