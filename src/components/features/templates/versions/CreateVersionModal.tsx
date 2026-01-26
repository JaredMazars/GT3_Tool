'use client';

import { useState } from 'react';
import { X, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui';
import { useCreateVersion } from '@/hooks/templates/useTemplateVersions';

interface CreateVersionModalProps {
  templateId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateVersionModal({
  templateId,
  onClose,
  onSuccess,
}: CreateVersionModalProps) {
  const [changeNotes, setChangeNotes] = useState('');
  const { createVersion, isCreating, error } = useCreateVersion(templateId);

  const handleCreate = async () => {
    try {
      await createVersion(changeNotes || undefined);
      onSuccess();
    } catch (err) {
      // Error is already handled by the hook
      console.error('Failed to create version:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-corporate-lg max-w-lg w-full">
        {/* Header */}
        <div
          className="px-6 py-4 border-b border-forvis-gray-200 flex items-center justify-between"
          style={{
            background: 'linear-gradient(to right, #2E5AAC, #25488A)',
          }}
        >
          <h2 className="text-xl font-semibold text-white">
            Create New Version
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-forvis-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">
                This will snapshot the current template state
              </p>
              <p className="mt-1">
                All current sections and their content will be saved as a new
                version. Previous active versions will be deactivated.
              </p>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-forvis-blue-50 border border-forvis-blue-200">
            <Info className="w-5 h-5 text-forvis-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-forvis-blue-800">
              <p>
                The new version will automatically become the active version
                used for template generation.
              </p>
            </div>
          </div>

          {/* Change Notes */}
          <div>
            <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
              Change Notes (Optional but Recommended)
            </label>
            <textarea
              value={changeNotes}
              onChange={(e) => setChangeNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent resize-none"
              placeholder="Describe what changed in this version (e.g., 'Updated liability section language', 'Added new payment terms section')..."
            />
            <p className="mt-1 text-xs text-forvis-gray-500">
              Help your team understand what changed in this version
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-forvis-gray-200 flex justify-end gap-2">
          <Button onClick={onClose} variant="secondary" disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating}
            style={{
              background: isCreating
                ? undefined
                : 'linear-gradient(to right, #2E5AAC, #25488A)',
            }}
            className={isCreating ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {isCreating ? 'Creating Version...' : 'Create Version'}
          </Button>
        </div>
      </div>
    </div>
  );
}
