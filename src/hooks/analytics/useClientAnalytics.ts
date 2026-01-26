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
  clients: (GSClientID: string | number) => [...analyticsKeys.all, 'client', GSClientID] as const,
  documents: (GSClientID: string | number) => [...analyticsKeys.clients(GSClientID), 'documents'] as const,
  ratings: (GSClientID: string | number) => [...analyticsKeys.clients(GSClientID), 'ratings'] as const,
  rating: (GSClientID: string | number, ratingId: number) => [...analyticsKeys.ratings(GSClientID), ratingId] as const,
  ratios: (GSClientID: string | number) => [...analyticsKeys.clients(GSClientID), 'ratios'] as const,
  latestRating: (GSClientID: string | number) => [...analyticsKeys.ratings(GSClientID), 'latest'] as const,
};

/**
 * Fetch all analytics documents for a client
 */
export function useAnalyticsDocuments(GSClientID: string | number) {
  return useQuery({
    queryKey: analyticsKeys.documents(GSClientID),
    queryFn: async () => {
      const res = await fetch(`/api/clients/${GSClientID}/analytics/documents`);
      if (!res.ok) throw new Error('Failed to fetch analytics documents');
      const data = await res.json();
      return data.data as { documents: AnalyticsDocument[]; totalCount: number };
    },
    enabled: !!GSClientID,
  });
}

/**
 * Upload analytics document
 */
export function useUploadAnalyticsDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      GSClientID,
      file,
      documentType,
    }: {
      GSClientID: string | number;
      file: File;
      documentType: AnalyticsDocumentType;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);

      const res = await fetch(`/api/clients/${GSClientID}/analytics/documents`, {
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
        queryKey: analyticsKeys.documents(variables.GSClientID),
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
      GSClientID,
      documentId,
    }: {
      GSClientID: string | number;
      documentId: number;
    }) => {
      const res = await fetch(`/api/clients/${GSClientID}/analytics/documents/${documentId}`, {
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
        queryKey: analyticsKeys.documents(variables.GSClientID),
      });
    },
  });
}

/**
 * Fetch credit rating history for a client
 */
export function useCreditRatings(
  GSClientID: string | number,
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
    queryKey: [...analyticsKeys.ratings(GSClientID), params.toString()],
    queryFn: async () => {
      const url = `/api/clients/${GSClientID}/analytics/rating${
        params.toString() ? `?${params.toString()}` : ''
      }`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch credit ratings');
      }
      const data = await res.json();
      return data.data as { ratings: CreditRating[]; totalCount: number };
    },
    enabled: options?.enabled !== false && !!GSClientID,
  });
}

/**
 * Fetch latest credit rating for a client
 */
export function useLatestCreditRating(GSClientID: string | number) {
  const { data, ...rest } = useCreditRatings(GSClientID, { limit: 1 });

  return {
    data: data?.ratings?.[0] || null,
    ...rest,
  };
}

/**
 * Fetch a specific credit rating
 */
export function useCreditRating(GSClientID: string | number, ratingId: number | null) {
  return useQuery({
    queryKey: analyticsKeys.rating(GSClientID, ratingId!),
    queryFn: async () => {
      const res = await fetch(`/api/clients/${GSClientID}/analytics/rating/${ratingId}`);
      if (!res.ok) throw new Error('Failed to fetch credit rating');
      const data = await res.json();
      return data.data as CreditRating;
    },
    enabled: !!GSClientID && !!ratingId,
  });
}

/**
 * Generate new credit rating
 */
export function useGenerateCreditRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      GSClientID,
      documentIds,
    }: {
      GSClientID: string | number;
      documentIds: number[];
    }) => {
      const res = await fetch(`/api/clients/${GSClientID}/analytics/rating`, {
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
        queryKey: analyticsKeys.clients(variables.GSClientID),
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
      GSClientID,
      ratingId,
    }: {
      GSClientID: string | number;
      ratingId: number;
    }) => {
      const res = await fetch(`/api/clients/${GSClientID}/analytics/rating/${ratingId}`, {
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
        queryKey: analyticsKeys.clients(variables.GSClientID),
      });
    },
  });
}

/**
 * Fetch latest financial ratios for a client
 */
export function useFinancialRatios(GSClientID: string | number) {
  return useQuery({
    queryKey: analyticsKeys.ratios(GSClientID),
    queryFn: async () => {
      const res = await fetch(`/api/clients/${GSClientID}/analytics/ratios`);
      if (!res.ok) throw new Error('Failed to fetch financial ratios');
      const data = await res.json();
      return data.data as { ratios: FinancialRatios | null; ratingDate?: Date };
    },
    enabled: !!GSClientID,
  });
}


