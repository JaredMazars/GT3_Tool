/**
 * Document Management Service for Acceptance Questionnaires
 * Handles upload, storage, and retrieval of supporting documents (WeCheck, PONG, etc.)
 */

import { prisma } from '@/lib/db/prisma';
import { uploadFile, downloadFile } from '@/lib/services/documents/blobStorage';
import { logger } from '@/lib/utils/logger';

export type DocumentType = 'WECHECK' | 'PONG' | 'OTHER';

export interface UploadDocumentParams {
  responseId: number;
  documentType: DocumentType;
  file: {
    name: string;
    data: Buffer;
    size: number;
  };
  uploadedBy: string;
}

export interface AcceptanceDocumentInfo {
  id: number;
  responseId: number;
  documentType: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: Date;
}

/**
 * Upload a supporting document for a questionnaire response
 */
export async function uploadAcceptanceDocument(
  params: UploadDocumentParams
): Promise<AcceptanceDocumentInfo> {
  const { responseId, documentType, file, uploadedBy } = params;

  // Verify response exists
  const response = await prisma.clientAcceptanceResponse.findUnique({
    where: { id: responseId },
    select: { id: true, taskId: true },
  });

  if (!response) {
    throw new Error(`Acceptance response ${responseId} not found`);
  }

  logger.info(`Uploading acceptance document: ${file.name} for response ${responseId}`);

  // Upload to Azure Blob Storage
  const blobName = await uploadFile(file.data, file.name, response.taskId);
  
  logger.info(`Uploaded acceptance document to blob storage: ${blobName}`);

  // Store document record in database
  const document = await prisma.acceptanceDocument.create({
    data: {
      responseId,
      documentType,
      fileName: file.name, // Original file name
      filePath: blobName, // Blob storage path
      fileSize: file.size,
      uploadedBy,
    },
  });

  return document;
}

/**
 * Get all documents for a questionnaire response
 */
export async function getAcceptanceDocuments(
  responseId: number
): Promise<AcceptanceDocumentInfo[]> {
  const documents = await prisma.acceptanceDocument.findMany({
    where: { responseId },
    orderBy: { uploadedAt: 'desc' },
  });

  return documents;
}

/**
 * Get a single document by ID
 */
export async function getAcceptanceDocument(
  documentId: number
): Promise<AcceptanceDocumentInfo | null> {
  const document = await prisma.acceptanceDocument.findUnique({
    where: { id: documentId },
  });

  return document;
}

/**
 * Delete a document
 */
export async function deleteAcceptanceDocument(
  documentId: number
): Promise<void> {
  const document = await prisma.acceptanceDocument.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    throw new Error(`Document ${documentId} not found`);
  }

  // Note: For Azure Blob Storage, we typically don't delete the actual blob
  // to maintain audit trail. We just delete the database record.
  // If you need to delete from blob storage, import deleteFile from blobStorage.ts

  logger.info(`Deleting acceptance document record: ${documentId}`);

  // Delete database record
  await prisma.acceptanceDocument.delete({
    where: { id: documentId },
  });
}

/**
 * Get document file buffer for download
 */
export async function getDocumentBuffer(document: AcceptanceDocumentInfo): Promise<Buffer> {
  try {
    // Download from Azure Blob Storage
    const buffer = await downloadFile(document.filePath);
    return buffer;
  } catch (error) {
    logger.error(`Failed to download document ${document.id}:`, error);
    throw new Error(`Failed to retrieve document: ${document.fileName}`);
  }
}

/**
 * Get document file path (blob name) for download
 */
export function getDocumentFilePath(document: AcceptanceDocumentInfo): string {
  return document.filePath; // Returns blob storage path
}

/**
 * Get documents by type
 */
export async function getDocumentsByType(
  responseId: number,
  documentType: DocumentType
): Promise<AcceptanceDocumentInfo[]> {
  const documents = await prisma.acceptanceDocument.findMany({
    where: {
      responseId,
      documentType,
    },
    orderBy: { uploadedAt: 'desc' },
  });

  return documents;
}

/**
 * Count documents for a response
 */
export async function countDocuments(responseId: number): Promise<number> {
  return await prisma.acceptanceDocument.count({
    where: { responseId },
  });
}


