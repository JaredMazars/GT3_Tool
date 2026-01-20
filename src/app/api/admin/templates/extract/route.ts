/**
 * POST /api/admin/templates/extract
 * AI-powered template extraction from uploaded PDF/Word documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { processUploadedTemplate } from '@/lib/services/templates/templateExtractionService';
import {
  uploadTemplateTemp,
  initTemplatesStorage,
} from '@/lib/services/documents/blobStorage';
import { logger } from '@/lib/utils/logger';

// Allowed MIME types for template upload
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Extract template structure and placeholders from uploaded document
 * Returns AI suggestions for preview before template creation
 */
export const POST = secureRoute.ai({
  feature: Feature.MANAGE_TEMPLATES,
  handler: async (request: NextRequest, { user }) => {
    try {
      logger.info('Starting template extraction', { userId: user.id });

      // Ensure templates storage container exists
      await initTemplatesStorage();

      // Parse multipart form data
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        throw new AppError(
          400,
          'No file provided',
          ErrorCodes.VALIDATION_ERROR
        );
      }

      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new AppError(
          400,
          'Invalid file type. Only PDF and DOCX files are supported.',
          ErrorCodes.VALIDATION_ERROR,
          { fileType: file.type, allowedTypes: ALLOWED_MIME_TYPES }
        );
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new AppError(
          400,
          'File too large. Maximum size is 50MB.',
          ErrorCodes.VALIDATION_ERROR,
          { fileSize: file.size, maxSize: MAX_FILE_SIZE }
        );
      }

      logger.info('File validation passed', {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Step 1: Extract text and analyze structure with AI
      const { extractedText, suggestions } = await processUploadedTemplate(
        buffer,
        file.name,
        file.type
      );

      // Step 2: Upload to temporary blob storage for later retrieval
      const tempBlobPath = await uploadTemplateTemp(
        buffer,
        file.name,
        user.id
      );

      logger.info('Template extraction completed successfully', {
        fileName: file.name,
        confidence: suggestions.confidence,
        sectionCount: suggestions.blocks.length,
        placeholderCount: suggestions.detectedPlaceholders.length,
      });

      // Return suggestions for preview
      // Map 'blocks' to 'sections' to match frontend expectations
      const { blocks, ...restSuggestions } = suggestions;
      return NextResponse.json(
        successResponse({
          ...restSuggestions,
          sections: blocks,  // Rename blocks to sections
          tempBlobPath,
          originalFileName: file.name,
          extractedTextLength: extractedText.length,
        }),
        { status: 200 }
      );
    } catch (error) {
      // Let secureRoute handle the error
      throw error;
    }
  },
});
