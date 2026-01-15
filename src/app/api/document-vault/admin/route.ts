import { NextRequest, NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes, handleApiError } from '@/lib/utils/errorHandler';
import { uploadVaultDocument, initDocumentVaultStorage } from '@/lib/services/documents/blobStorage';
import { extractVaultDocumentMetadata } from '@/lib/services/documents/vaultDocumentExtraction';
import { approvalService } from '@/lib/services/approvals/approvalService';
import { invalidateDocumentVaultCache } from '@/lib/services/document-vault/documentVaultCache';
import { logger } from '@/lib/utils/logger';
import { SystemRole } from '@/types';

/**
 * GET /api/document-vault/admin
 * List documents for service line admin
 * Query params: serviceLine (required), status (optional)
 */
export const GET = secureRoute.query({
  feature: Feature.ACCESS_DOCUMENT_VAULT,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const serviceLine = searchParams.get('serviceLine');
    const status = searchParams.get('status');

    if (!serviceLine) {
      throw new AppError(
        400,
        'Service line parameter is required',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Check authorization: must be service line admin or system admin
    const isSystemAdmin = user.systemRole === SystemRole.SYSTEM_ADMIN;
    
    if (!isSystemAdmin) {
      // Check if user is admin for this service line
      const serviceLineRole = await prisma.serviceLineUser.findFirst({
        where: {
          userId: user.id,
          subServiceLineGroup: serviceLine,
          role: 'ADMINISTRATOR',
        },
      });

      if (!serviceLineRole) {
        throw new AppError(
          403,
          'Insufficient permissions to manage documents for this service line',
          ErrorCodes.FORBIDDEN
        );
      }
    }

    // Build query
    const where: any = {
      scope: 'SERVICE_LINE',
      serviceLine,
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    // Fetch documents
    const documents = await prisma.vaultDocument.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        documentType: true,
        fileName: true,
        fileSize: true,
        categoryId: true,
        scope: true,
        serviceLine: true,
        version: true,
        status: true,
        tags: true,
        effectiveDate: true,
        expiryDate: true,
        createdAt: true,
        updatedAt: true,
        uploadedBy: true,
        Category: {
          select: {
            id: true,
            name: true,
            documentType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(successResponse(documents));
  },
});

/**
 * POST /api/document-vault/admin
 * Upload new vault document (service line scoped)
 */
export const POST = secureRoute.fileUpload({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  handler: async (request, { user }) => {
    try {
      // Parse form data
      const formData = await request.formData();
      const file = formData.get('file') as File;
      
      // Get metadata from individual form fields
      const title = formData.get('title') as string;
      const description = formData.get('description') as string || '';
      const documentType = formData.get('documentType') as string;
      const categoryId = parseInt(formData.get('categoryId') as string);
      const scope = formData.get('scope') as string;
      const serviceLine = formData.get('serviceLine') as string;
      const tagsJson = formData.get('tags') as string;
      const effectiveDate = formData.get('effectiveDate') as string;
      const expiryDate = formData.get('expiryDate') as string;

      if (!file) {
        throw new AppError(
          400,
          'No file provided',
          ErrorCodes.VALIDATION_ERROR
        );
      }

      if (!title || !documentType || !categoryId || !scope || !serviceLine) {
        throw new AppError(
          400,
          'Missing required fields',
          ErrorCodes.VALIDATION_ERROR
        );
      }

      // Check authorization: must be service line admin or system admin
      const isSystemAdmin = user.systemRole === SystemRole.SYSTEM_ADMIN;
      
      if (!isSystemAdmin) {
        // Check if user is admin for this service line
        const serviceLineRole = await prisma.serviceLineUser.findFirst({
          where: {
            userId: user.id,
            subServiceLineGroup: serviceLine,
            role: 'ADMINISTRATOR',
          },
        });

        if (!serviceLineRole) {
          throw new AppError(
            403,
            'Insufficient permissions to upload documents for this service line',
            ErrorCodes.FORBIDDEN
          );
        }
      }

      // Validate file type
      const allowedTypes = [
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

      if (!allowedTypes.includes(file.type)) {
        throw new AppError(
          400,
          'Unsupported file type',
          ErrorCodes.FILE_UPLOAD_ERROR
        );
      }

      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        throw new AppError(
          400,
          'File size exceeds 50MB limit',
          ErrorCodes.FILE_UPLOAD_ERROR
        );
      }

      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Parse tags
      let tags = null;
      if (tagsJson) {
        try {
          tags = JSON.stringify(JSON.parse(tagsJson));
        } catch (e) {
          logger.warn('Failed to parse tags JSON', { tagsJson });
        }
      }

      // Create document record (status: PENDING_APPROVAL)
      const document = await prisma.vaultDocument.create({
        data: {
          title,
          description,
          documentType,
          fileName: file.name,
          filePath: '', // Will be updated after upload
          fileSize: file.size,
          mimeType: file.type,
          categoryId,
          scope,
          serviceLine,
          version: 1,
          status: 'PENDING_APPROVAL',
          aiExtractionStatus: 'PENDING',
          tags,
          effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          uploadedBy: user.id,
        },
        select: {
          id: true,
          title: true,
          documentType: true,
          serviceLine: true,
          Category: {
            select: { name: true },
          },
        },
      });

      // Upload to blob storage
      await initDocumentVaultStorage();
      const blobPath = await uploadVaultDocument(buffer, file.name, document.id, 1);

      // Update document with blob path
      await prisma.vaultDocument.update({
        where: { id: document.id },
        data: { filePath: blobPath },
      });

      // Create initial version record
      await prisma.vaultDocumentVersion.create({
        data: {
          documentId: document.id,
          version: 1,
          fileName: file.name,
          filePath: blobPath,
          fileSize: file.size,
          uploadedBy: user.id,
        },
      });

      // Start AI extraction in background (don't wait)
      extractVaultDocumentMetadata(
        buffer,
        document.id,
        1,
        file.type
      ).catch((err) => {
        logger.error('Background AI extraction failed', err, {
          documentId: document.id,
        });
      });

      // Create approval request
      const approval = await approvalService.createApproval({
        workflowType: 'VAULT_DOCUMENT',
        workflowId: document.id.toString(),
        title: `Document Upload: ${document.title}`,
        requestedById: user.id,
        context: {
          documentType: document.documentType,
          serviceLine: document.serviceLine,
          categoryName: document.Category.name,
        },
      });

      // Link approval to document
      await prisma.vaultDocument.update({
        where: { id: document.id },
        data: { approvalId: approval.id },
      });

      // Invalidate cache
      invalidateDocumentVaultCache();

      logger.info('Document uploaded by service line admin', {
        userId: user.id,
        documentId: document.id,
        serviceLine: document.serviceLine,
        approvalId: approval.id,
      });

      return NextResponse.json(
        successResponse({
          documentId: document.id,
          approvalId: approval.id,
          message: 'Document uploaded successfully and sent for approval',
        }),
        { status: 201 }
      );
    } catch (error: any) {
      logger.error('Failed to upload document', error, {
        userId: user.id,
      });

      return handleApiError(error, 'Upload document');
    }
  },
});
