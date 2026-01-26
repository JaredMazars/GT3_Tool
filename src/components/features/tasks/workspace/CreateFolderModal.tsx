'use client';

import { useState } from 'react';
import { X, Loader2, Folder } from 'lucide-react';
import { Button } from '@/components/ui';
import { GRADIENTS } from '@/lib/design-system/gradients';

interface CreateFolderModalProps {
  parentFolderId?: number;
  taskId: number;
  onSuccess?: () => void;
  onClose: () => void;
}

export function CreateFolderModal({ parentFolderId, taskId, onSuccess, onClose }: CreateFolderModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Folder name is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/workspace/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          parentFolderId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create folder');
      }

      // Success
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-corporate-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-forvis-gray-200">
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: GRADIENTS.icon.standard }}
            >
              <Folder className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-forvis-gray-900">Create New Folder</h2>
          </div>
          <button
            onClick={onClose}
            className="text-forvis-gray-500 hover:text-forvis-gray-700 transition-colors"
            disabled={isCreating}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="folder-name" className="block text-sm font-medium text-forvis-gray-700 mb-1">
              Folder Name *
            </label>
            <input
              id="folder-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter folder name..."
              className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent"
              disabled={isCreating}
              required
            />
          </div>

          <div>
            <label htmlFor="folder-description" className="block text-sm font-medium text-forvis-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              id="folder-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this folder..."
              className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:border-transparent text-sm"
              disabled={isCreating}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isCreating || !name.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Folder'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


































