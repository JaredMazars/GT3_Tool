/**
 * News Bulletin Document Download API
 * GET /api/news/[id]/document - Generate SAS URL for document download
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError, AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { generateNewsBulletinDocumentSasUrl } from '@/lib/services/documents/blobStorage';
import { logger } from '@/lib/utils/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse bulletin ID
    const bulletinId = parseInt(params.id);
    if (isNaN(bulletinId)) {
      throw new AppError(400, 'Invalid bulletin ID', ErrorCodes.VALIDATION_ERROR);
    }

    // 3. Get bulletin from database
    const bulletin = await prisma.newsBulletin.findUnique({
      where: { id: bulletinId },
      select: {
        id: true,
        documentFileName: true,
        documentFilePath: true,
        documentFileSize: true,
        showDocumentLink: true,
        isActive: true,
      },
    });

    if (!bulletin) {
      throw new AppError(404, 'Bulletin not found', ErrorCodes.NOT_FOUND);
    }

    // 4. Check if bulletin has a document
    if (!bulletin.documentFilePath || !bulletin.documentFileName) {
      throw new AppError(
        404,
        'No document attached to this bulletin',
        ErrorCodes.NOT_FOUND
      );
    }

    // 5. Generate SAS URL (60 minute expiration)
    logger.info('Generating SAS URL for bulletin document', {
      userId: user.id,
      bulletinId,
      documentPath: bulletin.documentFilePath,
    });

    const sasUrl = await generateNewsBulletinDocumentSasUrl(
      bulletin.documentFilePath,
      60
    );

    return NextResponse.json(
      successResponse({
        url: sasUrl,
        fileName: bulletin.documentFileName,
        fileSize: bulletin.documentFileSize,
        expiresIn: 60, // minutes
      })
    );
  } catch (error) {
    logger.error('Failed to generate document download URL', { error });
    return handleApiError(error, 'GET /api/news/[id]/document');
  }
}






