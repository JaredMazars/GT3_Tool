'use client';

import { useQuery } from '@tanstack/react-query';
import { ClientDocumentsResponse } from '@/types';

// Query Keys
export const clientDocumentKeys = {
  all: ['client-documents'] as const,
  byClient: (GSClientID: string | number) => [...clientDocumentKeys.all, GSClientID] as const,
};

/**
 * Fetch all documents for a client across all projects
 */
export function useClientDocuments(GSClientID: string | number, enabled = true) {
  return useQuery<ClientDocumentsResponse>({
    queryKey: clientDocumentKeys.byClient(GSClientID),
    queryFn: async () => {
      const response = await fetch(`/api/clients/${GSClientID}/documents`);
      if (!response.ok) {
        throw new Error('Failed to fetch client documents');
      }
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: enabled && !!GSClientID,
    staleTime: 5 * 60 * 1000, // 5 minutes - documents don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
  });
}

/**
 * Helper function to trigger a document download
 */
export function downloadClientDocument(
  GSClientID: string | number,
  documentType: string,
  documentId: number,
  taskId: number,
  fileName: string
) {
  const params = new URLSearchParams({
    documentType,
    documentId: documentId.toString(),
    taskId: taskId.toString(),
  });

  const url = `/api/clients/${GSClientID}/documents/download?${params.toString()}`;
  
  // Create a temporary anchor element and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}



