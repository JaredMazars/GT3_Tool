import { NextRequest, NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { CreateVaultDocumentSchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { canManageVaultDocuments } from '@/lib/services/document-vault/documentVaultAuthorization';
import { uploadVaultDocument, initDocumentVaultStorage, moveVaultDocumentFromTemp } from '@/lib/services/documents/blobStorage';
import { extractVaultDocumentMetadata } from '@/lib/services/documents/vaultDocumentExtraction';
import { approvalService } from '@/lib/services/approvals/approvalService';
import { invalidateDocumentVaultCache } from '@/lib/services/document-vault/documentVaultCache';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/admin/document-vault
 * Upload new vault document
 */
export const POST = secureRoute.fileUpload({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  handler: async (request, { user }) => {
    try {
      // Parse form data
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const metadataJson = formData.get('metadata') as string;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      if (!metadataJson) {
        return NextResponse.json(
          { error: 'No metadata provided' },
          { status: 400 }
        );
      }

      // Parse and validate metadata
      const metadata = JSON.parse(metadataJson);
      const validatedMetadata = CreateVaultDocumentSchema.parse(metadata);

      // Check authorization
      const canManage = await canManageVaultDocuments(
        user.id,
        validatedMetadata.serviceLine
      );

      if (!canManage) {
        return NextResponse.json(
          { error: 'Insufficient permissions to upload documents' },
          { status: 403 }
        );
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
        return NextResponse.json(
          { error: 'Unsupported file type' },
          { status: 400 }
        );
      }

      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: 'File size exceeds 50MB limit' },
          { status: 400 }
        );
      }

      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Validate category has approvers
      const categoryWithApprovers = await prisma.vaultDocumentCategory.findUnique({
        where: { id: validatedMetadata.categoryId },
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
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 404 }
        );
      }

      if (!categoryWithApprovers.active) {
        return NextResponse.json(
          { error: 'Cannot upload to inactive category' },
          { status: 400 }
        );
      }

      if (categoryWithApprovers._count.CategoryApprover === 0) {
        return NextResponse.json(
          { error: 'Cannot upload to this category. No approvers assigned. Contact administrator to add approvers first.' },
          { status: 400 }
        );
      }

      // Create document record (status: PENDING_APPROVAL)
      const document = await prisma.vaultDocument.create({
        data: {
          title: validatedMetadata.title,
          description: validatedMetadata.description,
          documentType: validatedMetadata.documentType,
          documentVersion: validatedMetadata.documentVersion,
          fileName: file.name,
          filePath: '', // Will be updated after upload
          fileSize: file.size,
          mimeType: file.type,
          categoryId: validatedMetadata.categoryId,
          scope: validatedMetadata.scope,
          serviceLine: validatedMetadata.serviceLine,
          version: 1,
          status: 'PENDING_APPROVAL',
          aiExtractionStatus: 'PENDING',
          tags: validatedMetadata.tags ? JSON.stringify(validatedMetadata.tags) : null,
          effectiveDate: validatedMetadata.effectiveDate ? new Date(validatedMetadata.effectiveDate) : null,
          expiryDate: validatedMetadata.expiryDate ? new Date(validatedMetadata.expiryDate) : null,
          uploadedBy: user.id,
        },
        select: {
          id: true,
          title: true,
          documentType: true,
          VaultDocumentCategory: {
            select: { name: true },
          },
        },
      });

      // Upload to blob storage or move from temp location
      await initDocumentVaultStorage();
      let blobPath: string;
      
      if (validatedMetadata.tempBlobPath) {
        // AI extraction workflow - move from temp to permanent location
        logger.info('Moving document from temp to permanent location', {
          tempPath: validatedMetadata.tempBlobPath,
          documentId: document.id,
        });
        blobPath = await moveVaultDocumentFromTemp(
          validatedMetadata.tempBlobPath,
          document.id,
          1,
          validatedMetadata.scope,
          validatedMetadata.documentType,
          document.VaultDocumentCategory.name
        );
      } else {
        // Standard upload workflow
        blobPath = await uploadVaultDocument(
          buffer,
          file.name,
          document.id,
          1,
          validatedMetadata.scope,
          validatedMetadata.documentType,
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
      if (!validatedMetadata.tempBlobPath) {
        // Standard workflow - extract metadata in background
        extractVaultDocumentMetadata(
          buffer,
          document.id,
          validatedMetadata.title,
          validatedMetadata.documentType,
          document.VaultDocumentCategory.name
        ).then(async (extracted) => {
          await prisma.vaultDocument.update({
            where: { id: document.id },
            data: {
              aiExtractionStatus: 'SUCCESS',
              aiSummary: extracted.summary,
              aiKeyPoints: JSON.stringify(extracted.keyPoints),
              aiExtractedText: extracted.extractedText,
            },
          });
          logger.info('AI extraction completed', { documentId: document.id });
        }).catch(async (error) => {
          await prisma.vaultDocument.update({
            where: { id: document.id },
            data: { aiExtractionStatus: 'FAILED' },
          });
          logger.error('AI extraction failed', { documentId: document.id, error });
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
        where: { categoryId: validatedMetadata.categoryId },
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
            title: `Document Approval: ${validatedMetadata.title}`,
            description: `Review and approve document upload: ${validatedMetadata.title} (${validatedMetadata.documentType})`,
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
      await invalidateDocumentVaultCache(document.id, validatedMetadata.serviceLine);

      return NextResponse.json(
        successResponse({
          id: document.id,
          title: document.title,
          approvalId: approval.id,
          status: 'PENDING_APPROVAL',
        }),
        { status: 201 }
      );
    } catch (error: any) {
      logger.error('Document upload failed', { error });
      return NextResponse.json(
        { error: error.message || 'Document upload failed' },
        { status: 500 }
      );
    }
  },
});

/**
 * GET /api/admin/document-vault
 * List all documents (including drafts and pending)
 */
export const GET = secureRoute.query({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  handler: async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Check authorization
    const canManage = await canManageVaultDocuments(user.id);
    if (!canManage) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Build where clause
    const where: any = {};
    
    if (status) {
      where.status = status;
    }

    // Fetch documents
    const documents = await prisma.vaultDocument.findMany({
      where,
      select: {
        id: true,
        title: true,
        documentType: true,
        scope: true,
        serviceLine: true,
        status: true,
        version: true,
        uploadedBy: true,
        createdAt: true,
        publishedAt: true,
        archivedAt: true,
        VaultDocumentCategory: {
          select: {
            id: true,
            name: true,
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(successResponse(documents));
  },
});
