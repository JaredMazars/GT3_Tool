/**
 * Create Review Note Modal Component
 * Modal form for creating a new review note
 */

'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { TaskTeamSelector } from './TaskTeamSelector';
import { useCreateReviewNote } from '../hooks/useReviewNoteActions';
import { ReviewNotePriority, ReviewReferenceType } from '@/types/review-notes';
import type { CreateReviewNoteDTO } from '@/types/review-notes';

interface CreateReviewNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
}

export function CreateReviewNoteModal({ isOpen, onClose, taskId }: CreateReviewNoteModalProps) {
  const [formData, setFormData] = useState<Partial<CreateReviewNoteDTO>>({
    title: '',
    description: '',
    referenceUrl: '',
    referenceType: ReviewReferenceType.EXTERNAL,
    priority: ReviewNotePriority.MEDIUM,
    assignedTo: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const createMutation = useCreateReviewNote(taskId);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Title is required
    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 255) {
      newErrors.title = 'Title must be 255 characters or less';
    }

    // Description validation
    if (formData.description && formData.description.length > 5000) {
      newErrors.description = 'Description must be 5000 characters or less';
    }

    // Reference URL validation
    if (formData.referenceUrl) {
      try {
        new URL(formData.referenceUrl);
      } catch {
        newErrors.referenceUrl = 'Please enter a valid URL';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await createMutation.mutateAsync({
        taskId,
        title: formData.title!,
        description: formData.description || undefined,
        referenceUrl: formData.referenceUrl || undefined,
        referenceType: formData.referenceType || ReviewReferenceType.EXTERNAL,
        priority: formData.priority || ReviewNotePriority.MEDIUM,
        assignedTo: formData.assignedTo || undefined,
      } as CreateReviewNoteDTO);

      // Reset form and close modal on success
      setFormData({
        title: '',
        description: '',
        referenceUrl: '',
        referenceType: ReviewReferenceType.EXTERNAL,
        priority: ReviewNotePriority.MEDIUM,
        assignedTo: '',
      });
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Failed to create review note:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create review note' });
    }
  };

  const handleClose = () => {
    if (!createMutation.isPending) {
      setFormData({
        title: '',
        description: '',
        referenceUrl: '',
        referenceType: ReviewReferenceType.EXTERNAL,
        priority: ReviewNotePriority.MEDIUM,
        assignedTo: '',
      });
      setErrors({});
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="max-w-2xl w-full p-6 bg-white rounded-lg shadow-corporate-lg space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-forvis-gray-200">
          <h2 className="text-xl font-semibold text-forvis-gray-900">Add Review Note</h2>
          <button
            onClick={handleClose}
            disabled={createMutation.isPending}
            className="p-2 text-forvis-gray-600 hover:text-forvis-gray-900 rounded-lg hover:bg-forvis-gray-100 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 ${
                errors.title ? 'border-red-500' : 'border-forvis-gray-300'
              }`}
              placeholder="Enter review note title"
              maxLength={255}
              disabled={createMutation.isPending}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 ${
                errors.description ? 'border-red-500' : 'border-forvis-gray-300'
              }`}
              placeholder="Provide details about the review note"
              rows={4}
              maxLength={5000}
              disabled={createMutation.isPending}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
            <p className="mt-1 text-xs text-forvis-gray-500">
              {formData.description?.length || 0} / 5000 characters
            </p>
          </div>

          {/* Reference URL */}
          <div>
            <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
              Reference URL
            </label>
            <input
              type="url"
              value={formData.referenceUrl}
              onChange={(e) => setFormData({ ...formData, referenceUrl: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 ${
                errors.referenceUrl ? 'border-red-500' : 'border-forvis-gray-300'
              }`}
              placeholder="https://example.com/file#section"
              disabled={createMutation.isPending}
            />
            {errors.referenceUrl && (
              <p className="mt-1 text-sm text-red-600">{errors.referenceUrl}</p>
            )}
            <p className="mt-1 text-xs text-forvis-gray-500">
              Link to the file or section being reviewed
            </p>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
              Priority <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as ReviewNotePriority })}
              className="w-full px-3 py-2 border border-forvis-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
              disabled={createMutation.isPending}
            >
              <option value={ReviewNotePriority.LOW}>Low</option>
              <option value={ReviewNotePriority.MEDIUM}>Medium</option>
              <option value={ReviewNotePriority.HIGH}>High</option>
              <option value={ReviewNotePriority.CRITICAL}>Critical</option>
            </select>
          </div>

          {/* Assigned To */}
          <TaskTeamSelector
            taskId={taskId}
            value={formData.assignedTo || null}
            onChange={(userId, userName) => setFormData({ ...formData, assignedTo: userId })}
            label="Assign To"
            required={false}
          />

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-forvis-gray-200">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              size="md"
              disabled={createMutation.isPending}
              icon={createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Review Note'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

