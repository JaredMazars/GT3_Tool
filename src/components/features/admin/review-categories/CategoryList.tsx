/**
 * Category List Component
 * Displays all review note categories with actions
 */

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, Trash2, Eye, EyeOff, GripVertical, Tag } from 'lucide-react';
import { LoadingSpinner, Button } from '@/components/ui';
import type { ReviewCategory } from '@prisma/client';

interface CategoryWithStats extends ReviewCategory {
  _count: {
    ReviewNote: number;
  };
}

interface CategoryListProps {
  onEdit: (category: ReviewCategory) => void;
}

export function CategoryList({ onEdit }: CategoryListProps) {
  const [showInactive, setShowInactive] = useState(false);
  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories, isLoading, error } = useQuery<CategoryWithStats[]>({
    queryKey: ['admin-review-categories', showInactive],
    queryFn: async () => {
      const response = await fetch(`/api/admin/review-categories?includeInactive=${showInactive}`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      const result = await response.json();
      return result.data;
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const response = await fetch(`/api/admin/review-categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      if (!response.ok) throw new Error('Failed to update category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-review-categories'] });
      queryClient.invalidateQueries({ queryKey: ['review-categories'] });
    },
  });

  // Delete category
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/review-categories/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-review-categories'] });
      queryClient.invalidateQueries({ queryKey: ['review-categories'] });
    },
  });

  const handleToggleActive = (category: CategoryWithStats) => {
    if (category._count.ReviewNote > 0 && category.active) {
      if (!confirm(`This category has ${category._count.ReviewNote} notes. Are you sure you want to deactivate it?`)) {
        return;
      }
    }
    toggleActiveMutation.mutate({ id: category.id, active: !category.active });
  };

  const handleDelete = (category: CategoryWithStats) => {
    if (category._count.ReviewNote > 0) {
      alert(`Cannot delete category with ${category._count.ReviewNote} associated notes. Deactivate it instead.`);
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete "${category.name}"?`)) {
      return;
    }
    deleteMutation.mutate(category.id);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        Failed to load categories. Please try again.
      </div>
    );
  }

  const sortedCategories = [...(categories || [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-forvis-gray-600">
          {categories?.length || 0} {categories?.length === 1 ? 'category' : 'categories'}
        </div>
        <button
          onClick={() => setShowInactive(!showInactive)}
          className="text-sm text-forvis-blue-600 hover:text-forvis-blue-800 flex items-center space-x-1"
        >
          {showInactive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span>{showInactive ? 'Hide' : 'Show'} Inactive</span>
        </button>
      </div>

      {/* Categories List */}
      {sortedCategories.length === 0 ? (
        <div className="text-center py-12 bg-forvis-gray-50 rounded-lg">
          <Tag className="w-12 h-12 text-forvis-gray-400 mx-auto mb-3" />
          <p className="text-forvis-gray-600">No categories found.</p>
          <p className="text-sm text-forvis-gray-500 mt-2">
            Click "Add Category" to create your first category.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-forvis-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-forvis-gray-200">
            <thead className="bg-forvis-gray-50">
              <tr>
                <th scope="col" className="w-12 px-3 py-3 text-left">
                  <GripVertical className="w-4 h-4 text-forvis-gray-400" />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                  Service Line
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-forvis-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-forvis-gray-200">
              {sortedCategories.map((category) => (
                <tr
                  key={category.id}
                  className={`hover:bg-forvis-gray-50 transition-colors ${
                    !category.active ? 'opacity-60' : ''
                  }`}
                >
                  <td className="px-3 py-4">
                    <GripVertical className="w-4 h-4 text-forvis-gray-400 cursor-move" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start space-x-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
                        style={{ background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)' }}
                      >
                        <Tag className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-forvis-gray-900">
                          {category.name}
                        </div>
                        {category.description && (
                          <div className="text-sm text-forvis-gray-500 mt-0.5">
                            {category.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-forvis-gray-900">
                      {category.serviceLine || 'All'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-forvis-blue-100 text-forvis-blue-800">
                      {category._count.ReviewNote}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        category.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {category.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => onEdit(category)}
                      className="text-forvis-blue-600 hover:text-forvis-blue-900 inline-flex items-center space-x-1"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(category)}
                      className="text-forvis-gray-600 hover:text-forvis-gray-900 inline-flex items-center space-x-1"
                      title={category.active ? 'Deactivate' : 'Activate'}
                      disabled={toggleActiveMutation.isPending}
                    >
                      {category.active ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    {category._count.ReviewNote === 0 && (
                      <button
                        onClick={() => handleDelete(category)}
                        className="text-red-600 hover:text-red-900 inline-flex items-center space-x-1"
                        title="Delete"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


