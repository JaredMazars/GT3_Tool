import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
  AnalyticsDocument,
  CreditRating,
  FinancialRatios,
  GenerateCreditRatingRequest,
  AnalyticsDocumentType,
} from '@/types/analytics';

export const analyticsKeys = {
  all: ['analytics'] as const,
  clients: (clientId: string | number) => [...analyticsKeys.all, 'client', clientId] as const,
  documents: (clientId: string | number) => [...analyticsKeys.clients(clientId), 'documents'] as const,
  ratings: (clientId: string | number) => [...analyticsKeys.clients(clientId), 'ratings'] as const,
  rating: (clientId: string | number, ratingId: number) => [...analyticsKeys.ratings(clientId), ratingId] as const,
  ratios: (clientId: string | number) => [...analyticsKeys.clients(clientId), 'ratios'] as const,
  latestRating: (clientId: string | number) => [...analyticsKeys.ratings(clientId), 'latest'] as const,
};

/**
 * Fetch all analytics documents for a client
 */
export function useAnalyticsDocuments(clientId: string | number) {
  return useQuery({
    queryKey: analyticsKeys.documents(clientId),
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/analytics/documents`);
      if (!res.ok) throw new Error('Failed to fetch analytics documents');
      const data = await res.json();
      return data.data as { documents: AnalyticsDocument[]; totalCount: number };
    },
    enabled: !!clientId,
  });
}

/**
 * Upload analytics document
 */
export function useUploadAnalyticsDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      file,
      documentType,
    }: {
      clientId: string | number;
      file: File;
      documentType: AnalyticsDocumentType;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);

      const res = await fetch(`/api/clients/${clientId}/analytics/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to upload document');
      }

      const data = await res.json();
      return data.data as AnalyticsDocument;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: analyticsKeys.documents(variables.clientId),
      });
    },
  });
}

/**
 * Delete analytics document
 */
export function useDeleteAnalyticsDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      documentId,
    }: {
      clientId: string | number;
      documentId: number;
    }) => {
      const res = await fetch(`/api/clients/${clientId}/analytics/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        // For 409 Conflict (document in use), preserve full error details
        const customError = new Error(error.message || error.error || 'Failed to delete document') as Error & {
          status?: number;
          ratingsAffected?: unknown;
        };
        customError.status = res.status;
        if (res.status === 409 && error.ratingsAffected) {
          customError.ratingsAffected = error.ratingsAffected;
        }
        throw customError;
      }

      const data = await res.json();
      return data.data;
    },
    onSuccess: async (_, variables) => {
      // Refetch documents list immediately
      await queryClient.refetchQueries({
        queryKey: analyticsKeys.documents(variables.clientId),
      });
    },
  });
}

/**
 * Fetch credit rating history for a client
 */
export function useCreditRatings(
  clientId: string | number,
  options?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
    enabled?: boolean;
  }
) {
  const params = new URLSearchParams();
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.startDate) params.append('startDate', options.startDate);
  if (options?.endDate) params.append('endDate', options.endDate);

  return useQuery({
    queryKey: [...analyticsKeys.ratings(clientId), params.toString()],
    queryFn: async () => {
      const url = `/api/clients/${clientId}/analytics/rating${
        params.toString() ? `?${params.toString()}` : ''
      }`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch credit ratings');
      }
      const data = await res.json();
      return data.data as { ratings: CreditRating[]; totalCount: number };
    },
    enabled: options?.enabled !== false && !!clientId,
  });
}

/**
 * Fetch latest credit rating for a client
 */
export function useLatestCreditRating(clientId: string | number) {
  const { data, ...rest } = useCreditRatings(clientId, { limit: 1 });

  return {
    data: data?.ratings?.[0] || null,
    ...rest,
  };
}

/**
 * Fetch a specific credit rating
 */
export function useCreditRating(clientId: string | number, ratingId: number | null) {
  return useQuery({
    queryKey: analyticsKeys.rating(clientId, ratingId!),
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/analytics/rating/${ratingId}`);
      if (!res.ok) throw new Error('Failed to fetch credit rating');
      const data = await res.json();
      return data.data as CreditRating;
    },
    enabled: !!clientId && !!ratingId,
  });
}

/**
 * Generate new credit rating
 */
export function useGenerateCreditRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      documentIds,
    }: {
      clientId: string | number;
      documentIds: number[];
    }) => {
      const res = await fetch(`/api/clients/${clientId}/analytics/rating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentIds }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate credit rating');
      }

      const data = await res.json();
      return data.data as CreditRating;
    },
    onSuccess: async (_, variables) => {
      // Refetch all queries related to this client's analytics immediately
      // This ensures all tabs (ratings, ratios) show new data without manual refresh
      await queryClient.refetchQueries({
        queryKey: analyticsKeys.clients(variables.clientId),
      });
    },
  });
}

/**
 * Delete a credit rating
 */
export function useDeleteCreditRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      ratingId,
    }: {
      clientId: string | number;
      ratingId: number;
    }) => {
      const res = await fetch(`/api/clients/${clientId}/analytics/rating/${ratingId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete rating');
      }

      const data = await res.json();
      return data.data;
    },
    onSuccess: async (_, variables) => {
      // Refetch all queries related to this client's analytics
      await queryClient.refetchQueries({
        queryKey: analyticsKeys.clients(variables.clientId),
      });
    },
  });
}

/**
 * Fetch latest financial ratios for a client
 */
export function useFinancialRatios(clientId: string | number) {
  return useQuery({
    queryKey: analyticsKeys.ratios(clientId),
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/analytics/ratios`);
      if (!res.ok) throw new Error('Failed to fetch financial ratios');
      const data = await res.json();
      return data.data as { ratios: FinancialRatios | null; ratingDate?: Date };
    },
    enabled: !!clientId,
  });
}

