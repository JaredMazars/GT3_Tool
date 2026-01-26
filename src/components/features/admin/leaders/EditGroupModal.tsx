'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name?: string; description?: string }) => Promise<void>;
  currentName: string;
  currentDescription: string | null;
  currentType: 'GROUP' | 'INDIVIDUAL';
}

export function EditGroupModal({
  isOpen,
  onClose,
  onSubmit,
  currentName,
  currentDescription,
  currentType,
}: EditGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setDescription(currentDescription || '');
      setError(null);
    }
  }, [isOpen, currentName, currentDescription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const updates: { name?: string; description?: string } = {};
      
      // Only include changed fields
      if (name.trim() !== currentName) {
        updates.name = name.trim();
      }
      if (description.trim() !== (currentDescription || '')) {
        updates.description = description.trim() || undefined;
      }

      // Only submit if something changed
      if (Object.keys(updates).length > 0) {
        await onSubmit(updates);
      }
      
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update group';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  const hasChanges =
    name.trim() !== currentName || description.trim() !== (currentDescription || '');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-corporate-lg w-full max-w-lg">
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between border-b border-forvis-gray-200"
          style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
        >
          <h2 className="text-xl font-semibold text-white">Edit Leader Group</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Name field */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-forvis-gray-700 mb-1"
              >
                Group Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., EXCO, Board of Directors"
                required
                minLength={2}
                maxLength={100}
                disabled={loading}
                className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 disabled:bg-forvis-gray-100 disabled:cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-forvis-gray-500">
                2-100 characters. Letters, numbers, spaces, hyphens, and underscores only.
              </p>
            </div>

            {/* Type field (read-only) */}
            <div>
              <label className="block text-sm font-medium text-forvis-gray-700 mb-1">
                Type
              </label>
              <div className="px-3 py-2 bg-forvis-gray-100 border border-forvis-gray-300 rounded-lg text-sm text-forvis-gray-700">
                {currentType === 'GROUP' ? 'Group (Multiple Members)' : 'Individual Role (Single Person)'}
              </div>
              <p className="mt-1 text-xs text-forvis-gray-500">
                Type cannot be changed after creation
              </p>
            </div>

            {/* Description field */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-forvis-gray-700 mb-1"
              >
                Description <span className="text-forvis-gray-400">(optional)</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this leader group..."
                rows={3}
                maxLength={500}
                disabled={loading}
                className="w-full px-3 py-2 border border-forvis-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 focus:ring-offset-2 resize-none disabled:bg-forvis-gray-100 disabled:cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-forvis-gray-500">
                {description.length}/500 characters
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 border border-forvis-gray-300 rounded-lg text-sm font-medium text-forvis-gray-700 hover:bg-forvis-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !hasChanges}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background:
                  loading || !name.trim() || !hasChanges
                    ? '#9CA3AF'
                    : 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)',
              }}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
