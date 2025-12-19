/**
 * News Bulletin Document Upload & Extraction API
 * POST /api/news/upload-document - Upload PDF and extract content for bulletin generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkFeature } from '@/lib/permissions/checkFeature';
import { Feature } from '@/lib/permissions/features';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { logger } from '@/lib/utils/logger';
import { processUploadedPDF, uploadBulletinDocument } from '@/lib/services/news/documentService';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { checkRateLimit, RateLimitPresets } from '@/lib/utils/rateLimit';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check feature permission
    const hasPermission = await checkFeature(user.id, Feature.MANAGE_NEWS, 'BUSINESS_DEV');
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to upload bulletin documents' },
        { status: 403 }
      );
    }

    // 3. Rate limiting
    await checkRateLimit(request, RateLimitPresets.FILE_UPLOADS);

    // 4. Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      throw new AppError(
        400,
        'No file provided',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // 5. Validate file type
    if (file.type !== 'application/pdf') {
      throw new AppError(
        400,
        'Invalid file type. Only PDF files are supported.',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // 6. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(
        400,
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // 7. Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    logger.info('Processing uploaded PDF for bulletin', {
      userId: user.id,
      fileName: file.name,
      fileSize: file.size,
    });

    // 8. Process PDF: extract text and generate suggestions
    const result = await processUploadedPDF(buffer);

    logger.info('Successfully processed PDF and generated suggestions', {
      userId: user.id,
      fileName: file.name,
      confidence: result.suggestions.confidence,
    });

    // 9. Upload document to blob storage (temp folder - no bulletin ID yet)
    const uploadResult = await uploadBulletinDocument(buffer, file.name);

    logger.info('Successfully uploaded document to blob storage', {
      userId: user.id,
      filePath: uploadResult.filePath,
    });

    // 10. Return suggestions and document metadata to user for review
    return NextResponse.json(
      successResponse({
        suggestions: result.suggestions,
        extractedText: result.extractedText.substring(0, 500), // Preview only
        documentMetadata: {
          fileName: uploadResult.fileName,
          filePath: uploadResult.filePath,
          fileSize: uploadResult.fileSize,
          uploadedAt: uploadResult.uploadedAt,
        },
      })
    );
  } catch (error) {
    logger.error('Failed to process bulletin document upload', { error });
    return handleApiError(error, 'POST /api/news/upload-document');
  }
}


















