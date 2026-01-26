/**
 * News Bulletin Document Upload & Extraction API
 * POST /api/news/upload-document - Upload PDF and extract content for bulletin generation
 */

import { NextResponse } from 'next/server';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { logger } from '@/lib/utils/logger';
import { processUploadedPDF, uploadBulletinDocument } from '@/lib/services/news/documentService';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { secureRoute } from '@/lib/api/secureRoute';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['application/pdf'];

/**
 * POST /api/news/upload-document
 * Upload PDF and extract content for bulletin generation
 */
export const POST = secureRoute.fileUpload({
  handler: async (request, { user }) => {
    const hasPermission = await checkFeature(user.id, Feature.MANAGE_NEWS, 'BUSINESS_DEV');
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to upload bulletin documents' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      throw new AppError(400, 'No file provided', ErrorCodes.VALIDATION_ERROR);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new AppError(400, 'Invalid file type. Only PDF files are supported.', ErrorCodes.VALIDATION_ERROR);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(
        400,
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    logger.info('Processing uploaded PDF for bulletin', {
      userId: user.id,
      fileName: file.name,
      fileSize: file.size,
    });

    const result = await processUploadedPDF(buffer);

    logger.info('Successfully processed PDF and generated suggestions', {
      userId: user.id,
      fileName: file.name,
      confidence: result.suggestions.confidence,
    });

    const uploadResult = await uploadBulletinDocument(buffer, file.name);

    logger.info('Successfully uploaded document to blob storage', {
      userId: user.id,
      filePath: uploadResult.filePath,
    });

    return NextResponse.json(
      successResponse({
        suggestions: result.suggestions,
        extractedText: result.extractedText.substring(0, 500),
        documentMetadata: {
          fileName: uploadResult.fileName,
          filePath: uploadResult.filePath,
          fileSize: uploadResult.fileSize,
          uploadedAt: uploadResult.uploadedAt,
        },
      })
    );
  },
});


























