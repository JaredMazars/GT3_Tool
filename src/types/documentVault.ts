/**
 * Document Vault Types
 * Type definitions for firm document management system
 */

export type VaultDocumentType = 'POLICY' | 'SOP' | 'TEMPLATE' | 'MARKETING' | 'TRAINING' | 'OTHER';
export type VaultDocumentScope = 'GLOBAL' | 'SERVICE_LINE';
export type VaultDocumentStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'ARCHIVED';
export type AIExtractionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface VaultDocumentCategoryDTO {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  documentType: VaultDocumentType | null;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VaultDocumentDTO {
  id: number;
  title: string;
  description: string | null;
  documentType: VaultDocumentType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: VaultDocumentCategoryDTO;
  scope: VaultDocumentScope;
  serviceLine: string | null;
  version: number;
  status: VaultDocumentStatus;
  aiExtractionStatus: AIExtractionStatus;
  aiSummary: string | null;
  aiKeyPoints: string[] | null;
  tags: string[] | null;
  effectiveDate: Date | null;
  expiryDate: Date | null;
  uploadedBy: string;
  publishedAt: Date | null;
  archivedAt: Date | null;
  archivedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VaultDocumentVersionDTO {
  id: number;
  documentId: number;
  version: number;
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: Date;
  supersededAt: Date | null;
  changeNotes: string | null;
}

export interface VaultDocumentListItemDTO {
  id: number;
  title: string;
  documentType: VaultDocumentType;
  category: {
    id: number;
    name: string;
    icon: string | null;
    color: string | null;
  };
  scope: VaultDocumentScope;
  serviceLine: string | null;
  version: number;
  aiSummary: string | null;
  tags: string[] | null;
  publishedAt: Date | null;
  fileSize: number;
  mimeType: string;
}

export interface VaultDocumentDetailDTO extends VaultDocumentDTO {
  versions: VaultDocumentVersionDTO[];
  uploader: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface VaultDocumentFilters {
  search?: string;
  categoryId?: number;
  documentType?: VaultDocumentType;
  scope?: VaultDocumentScope;
  serviceLine?: string;
  status?: VaultDocumentStatus;
  tags?: string[];
}

export interface CreateVaultDocumentInput {
  title: string;
  description?: string;
  documentType: VaultDocumentType;
  categoryId: number;
  scope: VaultDocumentScope;
  serviceLine?: string;
  tags?: string[];
  effectiveDate?: string;
  expiryDate?: string;
}

export interface UpdateVaultDocumentInput {
  title?: string;
  description?: string;
  categoryId?: number;
  documentType?: VaultDocumentType;
  tags?: string[];
  effectiveDate?: string;
  expiryDate?: string;
}
