import { NextRequest, NextResponse } from 'next/server';
import { secureRoute } from '@/lib/api/secureRoute';
import { Feature } from '@/lib/permissions/features';
import { UpdateVaultDocumentSchema } from '@/lib/validation/schemas';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { uploadVaultDocument } from '@/lib/services/documents/blobStorage';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { invalidateDocumentVaultCache } from '@/lib/services/document-vault/documentVaultCache';
import { SystemRole } from '@/types';

/**
 * PATCH /api/document-vault/admin/[id]
 * Update document metadata and optionally replace file (DRAFT only)
 * Service line admin endpoint - validates service line permissions
 * Handles both JSON (metadata only) and multipart/form-data (with file)
 */
export const PATCH = secureRoute.fileUpload({
  feature: Feature.MANAGE_VAULT_DOCUMENTS,
  handler: async (request, { user }) => {
    // Extract document ID from URL path
    const pathParts = request.nextUrl.pathname.split('/');
    const idIndex = pathParts.findIndex(part => part === 'admin') + 1;
    const documentId = parseInt(pathParts[idIndex] || '0');

    if (isNaN(documentId)) {
      throw new AppError(400, 'Invalid document ID', ErrorCodes.VALIDATION_ERROR);
    }

    // Fetch document with category info
    const document = await prisma.vaultDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        serviceLine: true,
        scope: true,
        status: true,
        documentType: true,
        version: true,
        VaultDocumentCategory: {
          select: { name: true },
        },
      },
    });

    if (!document) {
      throw new AppError(404, 'Document not found', ErrorCodes.NOT_FOUND);
    }

    // Check authorization - system admin or service line admin
    const isSystemAdmin = user.systemRole === SystemRole.SYSTEM_ADMIN;
    
    if (!isSystemAdmin) {
      // Must be a service line document
      if (document.scope !== 'SERVICE_LINE' || !document.serviceLine) {
        throw new AppError(
          403,
          'Insufficient permissions to edit this document',
          ErrorCodes.FORBIDDEN
        );
      }

      // Check if user is admin for this service line
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
          'Insufficient permissions to edit this document',
          ErrorCodes.FORBIDDEN
        );
      }
    }

    // Only allow editing DRAFT documents
    if (document.status !== 'DRAFT') {
      throw new AppError(
        400,
        'Only DRAFT documents can be edited. Published documents require a new version.',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const metadataStr = formData.get('metadata') as string;

    if (!metadataStr) {
      throw new AppError(400, 'Metadata is required', ErrorCodes.VALIDATION_ERROR);
    }

    // Parse and validate metadata
    let metadata: any;
    try {
      metadata = JSON.parse(metadataStr);
    } catch {
      throw new AppError(400, 'Invalid metadata JSON', ErrorCodes.VALIDATION_ERROR);
    }

    // Validate metadata with Zod schema
    const validationResult = UpdateVaultDocumentSchema.safeParse(metadata);
    if (!validationResult.success) {
      throw new AppError(
        400,
        validationResult.error.errors[0]?.message || 'Invalid document metadata',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const data = validationResult.data;

    // Build update data for metadata
    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.documentType !== undefined) updateData.documentType = data.documentType;
    if (data.documentVersion !== undefined) updateData.documentVersion = data.documentVersion;
    if (data.scope !== undefined) updateData.scope = data.scope;
    if (data.serviceLine !== undefined) updateData.serviceLine = data.serviceLine;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    
    // Handle dates - convert empty strings to null, valid dates to Date objects
    if (data.effectiveDate !== undefined) {
      if (data.effectiveDate && data.effectiveDate.trim()) {
        // Append time to make it a valid datetime if it's just a date
        const dateStr = data.effectiveDate.includes('T') ? data.effectiveDate : `${data.effectiveDate}T00:00:00.000Z`;
        updateData.effectiveDate = new Date(dateStr);
      } else {
        updateData.effectiveDate = null;
      }
    }
    if (data.expiryDate !== undefined) {
      if (data.expiryDate && data.expiryDate.trim()) {
        // Append time to make it a valid datetime if it's just a date
        const dateStr = data.expiryDate.includes('T') ? data.expiryDate : `${data.expiryDate}T00:00:00.000Z`;
        updateData.expiryDate = new Date(dateStr);
      } else {
        updateData.expiryDate = null;
      }
    }

    // Handle file replacement if provided
    if (file) {
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
        throw new AppError(400, 'Unsupported file type', ErrorCodes.VALIDATION_ERROR);
      }

      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new AppError(400, 'File size exceeds 50MB limit', ErrorCodes.VALIDATION_ERROR);
      }

      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Upload to blob storage (direct replacement, no versioning for drafts)
      const blobPath = await uploadVaultDocument(
        buffer,
        file.name,
        documentId,
        document.version, // Keep same version for draft
        document.scope,
        document.documentType,
        document.VaultDocumentCategory.name
      );

      // Update file-related fields
      updateData.fileName = file.name;
      updateData.filePath = blobPath;
      updateData.fileSize = file.size;
      updateData.mimeType = file.type;
      // Reset AI extraction status when file changes
      updateData.aiExtractionStatus = 'PENDING';
      updateData.aiSummary = null;
      updateData.aiKeyPoints = null;
      updateData.aiExtractedText = null;
    }

    // Update document
    const updated = await prisma.vaultDocument.update({
      where: { id: documentId },
      data: updateData,
      select: {
        id: true,
        title: true,
        description: true,
        documentType: true,
        documentVersion: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        categoryId: true,
        scope: true,
        serviceLine: true,
        tags: true,
        effectiveDate: true,
        expiryDate: true,
        status: true,
        version: true,
        updatedAt: true,
      },
    });

    // Invalidate cache
    await invalidateDocumentVaultCache(documentId, document.serviceLine || undefined);

    return NextResponse.json(successResponse(updated));
  },
});
