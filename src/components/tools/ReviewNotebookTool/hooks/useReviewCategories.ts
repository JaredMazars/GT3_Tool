/**
 * React Query hooks for Review Categories
 * Handles fetching and managing review note categories
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReviewCategory } from '@prisma/client';
import type { CreateReviewCategoryDTO, UpdateReviewCategoryDTO } from '@/types/review-notes';

interface ReviewCategoriesResponse {
  success: boolean;
  data: ReviewCategory[];
}

interface ReviewCategoryResponse {
  success: boolean;
  data: ReviewCategory;
}

/**
 * Fetch all active review categories
 */
export function useReviewCategories(taskId: number, serviceLine?: string) {
  return useQuery({
    queryKey: ['review-categories', taskId, serviceLine],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (serviceLine) {
        params.append('serviceLine', serviceLine);
      }
      
      const url = `/api/tasks/${taskId}/review-notes/categories${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      
      const result: ReviewCategoriesResponse = await response.json();
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Create a new review category (Partner+ only)
 */
export function useCreateCategory(taskId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateReviewCategoryDTO) => {
      const response = await fetch(`/api/tasks/${taskId}/review-notes/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create category');
      }
      
      const result: ReviewCategoryResponse = await response.json();
      return result.data;
    },
    onSuccess: () => {
      // Invalidate all category queries
      queryClient.invalidateQueries({ queryKey: ['review-categories'] });
    },
  });
}

/**
 * Update an existing review category
 */
export function useUpdateCategory(taskId: number, categoryId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: UpdateReviewCategoryDTO) => {
      const response = await fetch(`/api/tasks/${taskId}/review-notes/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update category');
      }
      
      const result: ReviewCategoryResponse = await response.json();
      return result.data;
    },
    onSuccess: () => {
      // Invalidate all category queries
      queryClient.invalidateQueries({ queryKey: ['review-categories'] });
    },
  });
}

/**
 * Delete a review category (soft delete)
 */
export function useDeleteCategory(taskId: number, categoryId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/review-notes/categories/${categoryId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete category');
      }
      
      return true;
    },
    onSuccess: () => {
      // Invalidate all category queries
      queryClient.invalidateQueries({ queryKey: ['review-categories'] });
    },
  });
}



