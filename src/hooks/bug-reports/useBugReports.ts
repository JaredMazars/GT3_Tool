/**
 * React Query hooks for bug reports
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BugReportWithReporter, BugReportStatus, BugReportPriority } from '@/types/bugReport';

interface BugReportFilters {
  status?: BugReportStatus;
  priority?: BugReportPriority;
}

interface UpdateBugReportData {
  id: number;
  status?: BugReportStatus;
  priority?: BugReportPriority;
  resolutionNotes?: string;
}

/**
 * Hook to submit a new bug report
 */
export function useSubmitBugReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/bug-reports', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit bug report');
      }

      const data = await response.json();
      return data.data;
    },
    onSuccess: () => {
      // Invalidate bug reports list for admins
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
    },
  });
}

/**
 * Hook to fetch all bug reports (admin only)
 */
export function useBugReports(filters?: BugReportFilters) {
  return useQuery<BugReportWithReporter[]>({
    queryKey: ['bug-reports', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.priority) params.append('priority', filters.priority);

      const response = await fetch(`/api/bug-reports?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch bug reports');
      }

      const data = await response.json();
      return data.data;
    },
  });
}

/**
 * Hook to update a bug report (admin only)
 */
export function useUpdateBugReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateBugReportData) => {
      const response = await fetch(`/api/bug-reports/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update bug report');
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
    },
  });
}

/**
 * Hook to delete a bug report (admin only)
 */
export function useDeleteBugReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/bug-reports/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete bug report');
      }

      const data = await response.json();
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
    },
  });
}
