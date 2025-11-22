'use client';

import { useQuery } from '@tanstack/react-query';
import { ClientDocumentsResponse } from '@/types';

// Query Keys
export const clientDocumentKeys = {
  all: ['client-documents'] as const,
  byClient: (clientId: string | number) => [...clientDocumentKeys.all, clientId] as const,
};

/**
 * Fetch all documents for a client across all projects
 */
export function useClientDocuments(clientId: string | number, enabled = true) {
  return useQuery<ClientDocumentsResponse>({
    queryKey: clientDocumentKeys.byClient(clientId),
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}/documents`);
      if (!response.ok) {
        throw new Error('Failed to fetch client documents');
      }
      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: enabled && !!clientId,
    staleTime: 2 * 60 * 1000, // 2 minutes - documents change less frequently
    gcTime: 5 * 60 * 1000, // 5 minutes cache retention
  });
}

/**
 * Helper function to trigger a document download
 */
export function downloadClientDocument(
  clientId: string | number,
  documentType: string,
  documentId: number,
  projectId: number,
  fileName: string
) {
  const params = new URLSearchParams({
    documentType,
    documentId: documentId.toString(),
    projectId: projectId.toString(),
  });

  const url = `/api/clients/${clientId}/documents/download?${params.toString()}`;
  
  // Create a temporary anchor element and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

