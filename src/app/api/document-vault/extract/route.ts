/**
 * Document Vault Extraction API
 * POST /api/document-vault/extract - Upload document and extract field suggestions using AI
 */

import { NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { logger } from '@/lib/utils/logger';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { processUploadedDocument } from '@/lib/services/document-vault/documentVaultExtractionService';
import { uploadVaultDocumentTemp, initDocumentVaultStorage } from '@/lib/services/documents/blobStorage';
import { prisma } from '@/lib/db/prisma';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'text/plain',
  'text/markdown',
];

/**
 * POST /api/document-vault/extract
 * Upload document and extract field suggestions using AI
 */
export const POST = secureRoute.fileUpload({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  handler: async (request, { user }) => {
    try {
      // Parse form data
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        throw new AppError(400, 'No file provided', ErrorCodes.VALIDATION_ERROR);
      }

      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new AppError(
          400,
          'Unsupported file type. Please upload PDF, DOCX, XLSX, PPTX, or image files.',
          ErrorCodes.VALIDATION_ERROR
        );
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new AppError(
          400,
          `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          ErrorCodes.VALIDATION_ERROR
        );
      }

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      logger.info('Processing uploaded document for extraction', {
        userId: user.id,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });

      // Fetch available categories for AI matching
      const categories = await prisma.vaultDocumentCategory.findMany({
        where: { active: true },
        select: {
          id: true,
          name: true,
          description: true,
          documentType: true,
        },
        orderBy: { sortOrder: 'asc' },
      });

      logger.info('Fetched categories for AI matching', { categoryCount: categories.length });

      // Process document: extract text and generate suggestions
      const result = await processUploadedDocument(
        buffer,
        file.name,
        file.type,
        categories
      );

      logger.info('Successfully processed document and generated suggestions', {
        userId: user.id,
        fileName: file.name,
        confidence: result.suggestions.confidence,
        documentType: result.suggestions.documentType,
        suggestedCategory: result.suggestions.suggestedCategory,
      });

      // Upload document to temporary blob storage
      await initDocumentVaultStorage();
      const tempBlobPath = await uploadVaultDocumentTemp(buffer, file.name, user.id);

      logger.info('Successfully uploaded document to temporary storage', {
        userId: user.id,
        tempBlobPath,
      });

      // Return suggestions and metadata
      return NextResponse.json(
        successResponse({
          suggestions: result.suggestions,
          extractedText: result.extractedText.substring(0, 500), // Preview only
          documentMetadata: {
            fileName: file.name,
            tempBlobPath,
            fileSize: file.size,
            mimeType: file.type,
            uploadedAt: new Date().toISOString(),
          },
        })
      );
    } catch (error: any) {
      logger.error('Document extraction failed', { error, userId: user.id });
      
      // Provide user-friendly error messages
      if (error.message?.includes('Document Intelligence')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to extract content from document. Please try a different file or fill the form manually.',
          },
          { status: 500 }
        );
      }

      if (error.message?.includes('No text could be extracted')) {
        return NextResponse.json(
          {
            success: false,
            error: 'This document appears to be an image-based PDF or empty. Text extraction may be incomplete. Please fill the form manually.',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Document extraction failed. Please try again or fill the form manually.',
        },
        { status: 500 }
      );
    }
  },
});
