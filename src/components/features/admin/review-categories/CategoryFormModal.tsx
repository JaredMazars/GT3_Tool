/**
 * Category Form Modal
 * Create or edit review note category
 */

'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import type { ReviewCategory } from '@prisma/client';

interface ServiceLine {
  code: string;
  name: string;
  active: boolean;
  sortOrder: number;
}

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: ReviewCategory;
}

interface FormData {
  name: string;
  description: string;
  serviceLine: string;
  sortOrder: number;
  active: boolean;
}

export function CategoryFormModal({ isOpen, onClose, category }: CategoryFormModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: category?.name || '',
    description: category?.description || '',
    serviceLine: category?.serviceLine || '',
    sortOrder: category?.sortOrder || 0,
    active: category?.active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  // Fetch service lines
  const { data: serviceLines, isLoading: serviceLinesLoading } = useQuery<ServiceLine[]>({
    queryKey: ['admin-service-lines'],
    queryFn: async () => {
      const response = await fetch('/api/admin/service-lines');
      if (!response.ok) throw new Error('Failed to fetch service lines');
      const result = await response.json();
      return result.data;
    },
  });

  // Reset form when category changes
  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        description: category.description || '',
        serviceLine: category.serviceLine || '',
        sortOrder: category.sortOrder,
        active: category.active,
      });
    }
  }, [category]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<FormData>) => {
      const response = await fetch('/api/admin/review-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create category');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-review-categories'] });
      queryClient.invalidateQueries({ queryKey: ['review-categories'] });
      onClose();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<FormData>) => {
      const response = await fetch(`/api/admin/review-categories/${category!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update category');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-review-categories'] });
      queryClient.invalidateQueries({ queryKey: ['review-categories'] });
      onClose();
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be 100 characters or less';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    if (formData.serviceLine && formData.serviceLine.length > 50) {
      newErrors.serviceLine = 'Service line must be 50 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const submitData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      serviceLine: formData.serviceLine.trim() || undefined,
      sortOrder: formData.sortOrder,
      active: formData.active,
    };

    try {
      if (category) {
        await updateMutation.mutateAsync(submitData);
      } else {
        await createMutation.mutateAsync(submitData);
      }
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to save category',
      });
    }
  };

  if (!isOpen) return null;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="max-w-2xl w-full p-6 bg-white rounded-lg shadow-corporate-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-forvis-gray-200">
          <h2 className="text-xl font-semibold text-forvis-gray-900">
            {category ? 'Edit Category' : 'Create Category'}
          </h2>
          <button
            onClick={onClose}
            disabled={isPending}
            className="p-2 text-forvis-gray-600 hover:text-forvis-gray-900 rounded-lg hover:bg-forvis-gray-100 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 ${
                errors.name ? 'border-red-500' : 'border-forvis-gray-300'
              }`}
              placeholder="e.g., Revenue Recognition, Disclosure Requirements"
              maxLength={100}
              disabled={isPending}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
            <p className="mt-1 text-xs text-forvis-gray-500">
              A clear, descriptive name for the category
            </p>
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
              placeholder="Optional: Describe what types of notes should use this category"
              rows={3}
              maxLength={500}
              disabled={isPending}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
            <p className="mt-1 text-xs text-forvis-gray-500">
              {formData.description.length} / 500 characters
            </p>
          </div>

          {/* Service Line */}
          <div>
            <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
              Service Line
            </label>
            <select
              value={formData.serviceLine}
              onChange={(e) => setFormData({ ...formData, serviceLine: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-forvis-blue-500 ${
                errors.serviceLine ? 'border-red-500' : 'border-forvis-gray-300'
              }`}
              disabled={isPending || serviceLinesLoading}
            >
              <option value="">All Service Lines</option>
              {serviceLines?.map((sl) => (
                <option key={sl.code} value={sl.code}>
                  {sl.name} ({sl.code})
                </option>
              ))}
            </select>
            {errors.serviceLine && (
              <p className="mt-1 text-sm text-red-600">{errors.serviceLine}</p>
            )}
            <p className="mt-1 text-xs text-forvis-gray-500">
              Restrict category to specific service line, or select "All Service Lines"
            </p>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-forvis-gray-700 mb-2">
              Sort Order
            </label>
            <input
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-forvis-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forvis-blue-500"
              min={0}
              disabled={isPending}
            />
            <p className="mt-1 text-xs text-forvis-gray-500">
              Lower numbers appear first in dropdowns and grouped views
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="h-4 w-4 text-forvis-blue-600 border-forvis-gray-300 rounded focus:ring-forvis-blue-500"
              disabled={isPending}
            />
            <label htmlFor="active" className="ml-2 block text-sm text-forvis-gray-900">
              Active (visible to users)
            </label>
          </div>

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
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              size="md"
              disabled={isPending}
              icon={isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
            >
              {isPending ? 'Saving...' : category ? 'Update Category' : 'Create Category'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

