/**
 * News Bulletin Document Download API
 * GET /api/news/[id]/document - Generate SAS URL for document download
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { generateNewsBulletinDocumentSasUrl } from '@/lib/services/documents/blobStorage';
import { logger } from '@/lib/utils/logger';
import { secureRoute } from '@/lib/api/secureRoute';

/**
 * GET /api/news/[id]/document
 * Generate SAS URL for document download
 */
export const GET = secureRoute.queryWithParams<{ id: string }>({
  handler: async (request, { user, params }) => {
    const bulletinId = Number.parseInt(params.id, 10);
    if (Number.isNaN(bulletinId)) {
      throw new AppError(400, 'Invalid bulletin ID', ErrorCodes.VALIDATION_ERROR);
    }

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

    if (!bulletin.documentFilePath || !bulletin.documentFileName) {
      throw new AppError(404, 'No document attached to this bulletin', ErrorCodes.NOT_FOUND);
    }

    logger.info('Generating SAS URL for bulletin document', {
      userId: user.id,
      bulletinId,
      documentPath: bulletin.documentFilePath,
    });

    const sasUrl = await generateNewsBulletinDocumentSasUrl(bulletin.documentFilePath, 60);

    return NextResponse.json(
      successResponse({
        url: sasUrl,
        fileName: bulletin.documentFileName,
        fileSize: bulletin.documentFileSize,
        expiresIn: 60,
      })
    );
  },
});


























