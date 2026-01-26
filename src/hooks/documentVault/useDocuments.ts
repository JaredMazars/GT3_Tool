import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { VaultDocumentListItemDTO, VaultDocumentDetailDTO, VaultDocumentFilters } from '@/types/documentVault';

/**
 * Hook to fetch document list
 */
export function useDocuments(filters?: VaultDocumentFilters) {
  return useQuery({
    queryKey: ['documents', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }

      const response = await fetch(`/api/document-vault?${params}`);
      if (!response.ok) throw new Error('Failed to fetch documents');
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch documents');
      
      return data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch document detail
 */
export function useDocument(documentId: number | string) {
  return useQuery({
    queryKey: ['document', documentId],
    queryFn: async () => {
      const response = await fetch(`/api/document-vault/${documentId}`);
      if (!response.ok) throw new Error('Failed to fetch document');
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch document');
      
      return data.data as VaultDocumentDetailDTO;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!documentId,
  });
}

/**
 * Hook to fetch categories
 */
export function useDocumentCategories(documentType?: string) {
  return useQuery({
    queryKey: ['documentCategories', documentType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (documentType) params.append('documentType', documentType);
      
      const response = await fetch(`/api/document-vault/categories?${params}`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch categories');
      
      return data.data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to download document
 */
export function useDownloadDocument() {
  return useMutation({
    mutationFn: async ({ documentId, version }: { documentId: number; version?: number }) => {
      const params = new URLSearchParams();
      if (version) params.append('version', String(version));
      
      const response = await fetch(`/api/document-vault/${documentId}/download?${params}`);
      if (!response.ok) throw new Error('Failed to get download URL');
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to get download URL');
      
      // Open download URL in new tab
      window.open(data.data.downloadUrl, '_blank');
      
      return data.data;
    },
  });
}

/**
 * Hook to get download URL for approval document (does not auto-open)
 * Used by approvers to preview/download documents pending approval
 */
export function useDownloadApprovalDocument(documentId: number) {
  return useQuery({
    queryKey: ['approvalDocumentDownload', documentId],
    queryFn: async () => {
      const response = await fetch(`/api/approvals/vault-documents/${documentId}/download`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get download URL');
      }
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to get download URL');
      
      return data.data as {
        downloadUrl: string;
        fileName: string;
        mimeType: string;
        expiresIn: number;
      };
    },
    staleTime: 50 * 60 * 1000, // 50 minutes (URL valid for 60 minutes)
    enabled: !!documentId,
  });
}

/**
 * Hook to search documents
 */
export function useSearchDocuments(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['documentSearch', query],
    queryFn: async () => {
      const params = new URLSearchParams({ query });
      
      const response = await fetch(`/api/document-vault/search?${params}`);
      if (!response.ok) throw new Error('Failed to search documents');
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to search documents');
      
      return data.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: enabled && query.length >= 2,
  });
}
