'use client';

import { AlertTriangle, X } from 'lucide-react';
import { ExistingTask } from '@/hooks/tasks/useCheckDuplicateTaskCode';
import { GRADIENTS } from '@/lib/design-system/gradients';

interface DuplicateTaskWarningProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  existingTasks: ExistingTask[];
  nextTaskCode: string;
  basePattern: string;
}

export function DuplicateTaskWarning({
  isOpen,
  onClose,
  onContinue,
  existingTasks,
  nextTaskCode,
  basePattern,
}: DuplicateTaskWarningProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-yellow-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Similar Tasks Exist</h2>
                <p className="text-sm text-gray-600">Tasks with pattern "{basePattern}" already exist</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-sm text-gray-700 mb-4">
            Found <span className="font-semibold">{existingTasks.length}</span> existing task{existingTasks.length !== 1 ? 's' : ''} with similar codes:
          </p>

          {/* Existing Tasks List */}
          <div className="space-y-2 mb-6">
            {existingTasks.map((task) => (
              <div
                key={task.id}
                className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-semibold text-forvis-blue-600">
                        {task.taskCode}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          task.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {task.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 mb-1">{task.taskDesc}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span>Year: {task.taskYear}</span>
                      {task.clientCode && (
                        <>
                          <span>•</span>
                          <span>Client: {task.clientCode}</span>
                        </>
                      )}
                      {task.clientName && (
                        <span className="truncate max-w-xs">({task.clientName})</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* New Task Code Info */}
          <div
            className="p-4 rounded-lg border-2 border-forvis-blue-200"
            style={{ background: GRADIENTS.dashboard.card }}
          >
            <p className="text-sm text-gray-700 mb-2">
              If you continue, the new task will be created with code:
            </p>
            <div className="flex items-center justify-center p-3 bg-white rounded-lg border border-forvis-blue-300">
              <span className="font-mono text-xl font-bold text-forvis-blue-600">
                {nextTaskCode}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onContinue}
              className="px-6 py-2 rounded-lg text-white font-medium transition-all"
              style={{ background: GRADIENTS.primary.horizontal }}
            >
              Continue with {nextTaskCode}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


























