import { NextRequest, NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes, handleApiError } from '@/lib/utils/errorHandler';
import { uploadVaultDocument, initDocumentVaultStorage, moveVaultDocumentFromTemp } from '@/lib/services/documents/blobStorage';
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
      // Check if user is admin for this master service line
      const serviceLineRole = await prisma.serviceLineUser.findFirst({
        where: {
          userId: user.id,
          masterCode: serviceLine,
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

    // Build query - include both service line specific AND global documents
    const where: any = {
      OR: [
        {
          scope: 'SERVICE_LINE',
          serviceLine,
        },
        {
          scope: 'GLOBAL',
        }
      ]
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
        VaultDocumentCategory: {
          select: {
            id: true,
            name: true,
            documentType: true,
          },
        },
        User: {
          select: {
            name: true,
            email: true,
          },
        },
        Approval: {
          select: {
            id: true,
            status: true,
            requiresAllSteps: true,
            ApprovalStep: {
              select: {
                id: true,
                stepOrder: true,
                status: true,
                approvedAt: true,
                comment: true,
                User_ApprovalStep_assignedToUserIdToUser: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
              orderBy: { stepOrder: 'asc' },
            },
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
 * Supports both old format (individual fields) and new format (metadata JSON with AI extraction)
 */
export const POST = secureRoute.fileUpload({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  handler: async (request, { user }) => {
    try {
      // Parse form data
      const formData = await request.formData();
      const file = formData.get('file') as File;
      
      // Check if using new format (metadata JSON) or old format (individual fields)
      const metadataJson = formData.get('metadata') as string;
      let metadata: any;
      
      if (metadataJson) {
        // New format with AI extraction support
        metadata = JSON.parse(metadataJson);
      } else {
        // Old format - convert individual fields to metadata object
        metadata = {
          title: formData.get('title') as string,
          description: (formData.get('description') as string) || undefined,
          documentType: formData.get('documentType') as string,
          categoryId: parseInt(formData.get('categoryId') as string),
          scope: formData.get('scope') as string,
          serviceLine: formData.get('serviceLine') as string,
          tags: formData.get('tags') ? JSON.parse(formData.get('tags') as string) : undefined,
          effectiveDate: (formData.get('effectiveDate') as string) || undefined,
          expiryDate: (formData.get('expiryDate') as string) || undefined,
        };
      }

      if (!file) {
        throw new AppError(
          400,
          'No file provided',
          ErrorCodes.VALIDATION_ERROR
        );
      }

      if (!metadata.title || !metadata.documentType || !metadata.categoryId || !metadata.scope) {
        throw new AppError(
          400,
          'Missing required fields',
          ErrorCodes.VALIDATION_ERROR
        );
      }

      // Only validate serviceLine if scope is SERVICE_LINE
      if (metadata.scope === 'SERVICE_LINE' && !metadata.serviceLine) {
        throw new AppError(
          400,
          'Service line is required for SERVICE_LINE scope',
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
            subServiceLineGroup: metadata.serviceLine,
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

      // Validate category has approvers
      const categoryWithApprovers = await prisma.vaultDocumentCategory.findUnique({
        where: { id: metadata.categoryId },
        select: {
          id: true,
          name: true,
          active: true,
          _count: {
            select: { CategoryApprover: true },
          },
        },
      });

      if (!categoryWithApprovers) {
        throw new AppError(404, 'Category not found', ErrorCodes.NOT_FOUND);
      }

      if (!categoryWithApprovers.active) {
        throw new AppError(400, 'Cannot upload to inactive category', ErrorCodes.VALIDATION_ERROR);
      }

      if (categoryWithApprovers._count.CategoryApprover === 0) {
        throw new AppError(
          400,
          'Cannot upload to this category. No approvers assigned. Contact administrator to add approvers first.',
          ErrorCodes.VALIDATION_ERROR
        );
      }

      // Parse tags
      const tags = metadata.tags ? JSON.stringify(metadata.tags) : null;

      // Create document record (status: PENDING_APPROVAL)
      const document = await prisma.vaultDocument.create({
        data: {
          title: metadata.title,
          description: metadata.description,
          documentType: metadata.documentType,
          documentVersion: metadata.documentVersion,
          fileName: file.name,
          filePath: '', // Will be updated after upload
          fileSize: file.size,
          mimeType: file.type,
          categoryId: metadata.categoryId,
          scope: metadata.scope,
          serviceLine: metadata.serviceLine,
          version: 1,
          status: 'PENDING_APPROVAL',
          aiExtractionStatus: 'PENDING',
          tags,
          effectiveDate: metadata.effectiveDate ? new Date(metadata.effectiveDate) : null,
          expiryDate: metadata.expiryDate ? new Date(metadata.expiryDate) : null,
          uploadedBy: user.id,
        },
        select: {
          id: true,
          title: true,
          documentType: true,
          serviceLine: true,
          VaultDocumentCategory: {
            select: { name: true },
          },
        },
      });

      // Upload to blob storage or move from temp location
      await initDocumentVaultStorage();
      let blobPath: string;
      
      if (metadata.tempBlobPath) {
        // AI extraction workflow - move from temp to permanent location
        logger.info('Moving document from temp to permanent location', {
          tempPath: metadata.tempBlobPath,
          documentId: document.id,
        });
        blobPath = await moveVaultDocumentFromTemp(
          metadata.tempBlobPath,
          document.id,
          1,
          metadata.scope,
          metadata.documentType,
          document.VaultDocumentCategory.name
        );
      } else {
        // Standard upload workflow
        blobPath = await uploadVaultDocument(
          buffer,
          file.name,
          document.id,
          1,
          metadata.scope,
          metadata.documentType,
          document.VaultDocumentCategory.name
        );
      }

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

      // Start AI extraction in background (don't wait) - only if not using AI extraction workflow
      if (!metadata.tempBlobPath) {
        // Standard workflow - extract metadata in background
        extractVaultDocumentMetadata(
          buffer,
          document.id,
          document.title,
          document.documentType,
          document.VaultDocumentCategory.name
        ).catch((err) => {
          logger.error('Background AI extraction failed', err, {
            documentId: document.id,
          });
        });
      } else {
        // AI extraction workflow - metadata already extracted during preview
        // Mark as success immediately since extraction was done upfront
        await prisma.vaultDocument.update({
          where: { id: document.id },
          data: { aiExtractionStatus: 'SUCCESS' },
        });
        logger.info('Using pre-extracted AI suggestions', { documentId: document.id });
      }

      // Get category approvers for approval workflow
      const categoryApprovers = await prisma.categoryApprover.findMany({
        where: { categoryId: metadata.categoryId },
        select: {
          userId: true,
          stepOrder: true,
        },
        orderBy: { stepOrder: 'asc' },
      });

      // Create approval with sequential steps from category approvers
      const approval = await prisma.$transaction(async (tx) => {
        // Create the approval
        const newApproval = await tx.approval.create({
          data: {
            workflowType: 'VAULT_DOCUMENT',
            workflowId: document.id,
            status: 'PENDING',
            priority: 'MEDIUM',
            title: `Document Approval: ${document.title}`,
            description: `Review and approve document upload: ${document.title} (${document.documentType})`,
            requestedById: user.id,
            requiresAllSteps: true, // Sequential approval - all must approve in order
            updatedAt: new Date(),
          },
        });

        // Create approval steps from category approvers
        const steps = await Promise.all(
          categoryApprovers.map((approver) =>
            tx.approvalStep.create({
              data: {
                approvalId: newApproval.id,
                stepOrder: approver.stepOrder,
                stepType: 'USER_APPROVAL',
                isRequired: true,
                assignedToUserId: approver.userId,
                status: 'PENDING',
                updatedAt: new Date(),
              },
            })
          )
        );

        // Set first step as current
        if (steps.length > 0) {
          await tx.approval.update({
            where: { id: newApproval.id },
            data: { currentStepId: steps[0]!.id },
          });
        }

        return newApproval;
      });

      // Link approval to document
      await prisma.vaultDocument.update({
        where: { id: document.id },
        data: { approvalId: approval.id },
      });

      // Invalidate cache
      await invalidateDocumentVaultCache(document.id, document.serviceLine || undefined);

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
