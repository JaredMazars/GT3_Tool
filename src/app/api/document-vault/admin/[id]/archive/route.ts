import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes, handleApiError } from '@/lib/utils/errorHandler';
import { invalidateDocumentVaultCache } from '@/lib/services/document-vault/documentVaultCache';
import { logger } from '@/lib/utils/logger';
import { SystemRole } from '@/types';

/**
 * PATCH /api/document-vault/admin/[id]/archive
 * Archive a document (service line admin or system admin)
 */
export const PATCH = secureRoute.mutationWithParams<z.ZodVoid, { id: string }>({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  handler: async (request, { user, params }) => {
    try {
      const documentId = parseInt(params.id);

      if (isNaN(documentId)) {
        throw new AppError(
          400,
          'Invalid document ID',
          ErrorCodes.VALIDATION_ERROR
        );
      }

      // Fetch the document
      const document = await prisma.vaultDocument.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          serviceLine: true,
          scope: true,
          status: true,
        },
      });

      if (!document) {
        throw new AppError(
          404,
          'Document not found',
          ErrorCodes.NOT_FOUND
        );
      }

      // Check authorization
      const isSystemAdmin = user.systemRole === SystemRole.SYSTEM_ADMIN;
      
      if (!isSystemAdmin) {
        // Check if user is admin for the document's service line
        if (document.scope !== 'SERVICE_LINE' || !document.serviceLine) {
          throw new AppError(
            403,
            'Insufficient permissions to archive this document',
            ErrorCodes.FORBIDDEN
          );
        }

        const serviceLineRole = await prisma.serviceLineUser.findFirst({
          where: {
            userId: user.id,
            subServiceLineGroup: document.serviceLine,
            role: 'ADMINISTRATOR',
          },
        });

        if (!serviceLineRole) {
          throw new AppError(
            403,
            'Insufficient permissions to archive this document',
            ErrorCodes.FORBIDDEN
          );
        }
      }

      // Archive the document
      await prisma.vaultDocument.update({
        where: { id: documentId },
        data: {
          status: 'ARCHIVED',
          archivedAt: new Date(),
          archivedBy: user.id,
        },
      });

      // Invalidate cache
      await invalidateDocumentVaultCache(documentId, document.serviceLine || undefined);

      logger.info('Document archived by service line admin', {
        userId: user.id,
        documentId,
        serviceLine: document.serviceLine,
      });

      return NextResponse.json(
        successResponse({ message: 'Document archived successfully' })
      );
    } catch (error: any) {
      logger.error('Failed to archive document', error, {
        userId: user.id,
        documentId: params.id,
      });

      return handleApiError(error, 'Archive document');
    }
  },
});
