import { NextRequest, NextResponse } from 'next/server';
import { checkClientAccess } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { DocumentExtractor } from '@/lib/services/documents/documentExtractor';
import { logger } from '@/lib/utils/logger';
import path from 'node:path';
import fs from 'fs/promises';
import { fileTypeFromBuffer } from 'file-type';
import { GSClientIDSchema, UploadAnalyticsDocumentSchema } from '@/lib/validation/schemas';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

const MAX_FILE_SIZE = Number.parseInt(process.env.MAX_FILE_UPLOAD_SIZE || '10485760', 10); // 10MB default
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'image/png',
  'image/jpeg',
];

/**
 * GET /api/clients/[id]/analytics/documents
 * Fetch all analytics documents for a client
 */
export const GET = secureRoute.queryWithParams<{ id: string }>({
  feature: Feature.ACCESS_CLIENTS,
  handler: async (request, { user, params }) => {
    const GSClientID = params.id;

    // Validate GSClientID is a valid GUID
    const validationResult = GSClientIDSchema.safeParse(GSClientID);
    if (!validationResult.success) {
      throw new AppError(400, 'Invalid client ID format. Expected GUID.', ErrorCodes.VALIDATION_ERROR);
    }

    // SECURITY: Check authorization - user must have access to this client
    const hasAccess = await checkClientAccess(user.id, GSClientID);
    if (!hasAccess) {
      logger.warn('Unauthorized client access attempt', {
        userId: user.id,
        GSClientID,
        action: 'GET /analytics/documents',
      });
      throw new AppError(403, 'Forbidden', ErrorCodes.FORBIDDEN);
    }

    // Verify client exists and get numeric id
    const client = await prisma.client.findUnique({
      where: { GSClientID: GSClientID },
      select: { id: true },
    });

    if (!client) {
      throw new AppError(404, 'Client not found', ErrorCodes.NOT_FOUND);
    }

    // Fetch all analytics documents for this client (using numeric id)
    const documents = await prisma.clientAnalyticsDocument.findMany({
      where: { clientId: client.id },
      orderBy: [
        { uploadedAt: 'desc' },
        { id: 'desc' }, // Deterministic secondary sort
      ],
      take: 100, // Prevent unbounded queries
      select: {
        id: true,
        clientId: true,
        documentType: true,
        fileName: true,
        filePath: true,
        fileSize: true,
        uploadedBy: true,
        uploadedAt: true,
        extractedData: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      successResponse({
        documents,
        totalCount: documents.length,
      })
    );
  },
});

/**
 * POST /api/clients/[id]/analytics/documents
 * Upload a new analytics document
 */
export const POST = secureRoute.fileUploadWithParams<{ id: string }>({
  feature: Feature.MANAGE_CLIENTS,
  handler: async (request, { user, params }) => {
    const GSClientID = params.id;

    // Validate GSClientID is a valid GUID
    const validationResult = GSClientIDSchema.safeParse(GSClientID);
    if (!validationResult.success) {
      throw new AppError(400, 'Invalid client ID format. Expected GUID.', ErrorCodes.VALIDATION_ERROR);
    }

    // SECURITY: Check authorization
    const hasAccess = await checkClientAccess(user.id, GSClientID);
    if (!hasAccess) {
      logger.warn('Unauthorized document upload attempt', {
        userId: user.id,
        GSClientID,
      });
      throw new AppError(403, 'Forbidden', ErrorCodes.FORBIDDEN);
    }

    // Verify client exists and get numeric id
    const client = await prisma.client.findUnique({
      where: { GSClientID: GSClientID },
      select: { id: true },
    });

    if (!client) {
      throw new AppError(404, 'Client not found', ErrorCodes.NOT_FOUND);
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const rawDocumentType = (formData.get('documentType') as string) || 'OTHER';

    // Validate documentType with Zod schema
    const docTypeValidation = UploadAnalyticsDocumentSchema.safeParse({ documentType: rawDocumentType });
    if (!docTypeValidation.success) {
      throw new AppError(400, 'Invalid document type', ErrorCodes.VALIDATION_ERROR, {
        validTypes: ['AFS', 'MANAGEMENT_ACCOUNTS', 'BANK_STATEMENTS', 'CASH_FLOW', 'OTHER'],
      });
    }
    const documentType = docTypeValidation.data.documentType;

    if (!file) {
      throw new AppError(400, 'No file provided', ErrorCodes.VALIDATION_ERROR);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(400, `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`, ErrorCodes.VALIDATION_ERROR);
    }

    // Validate MIME type from header
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new AppError(400, 'Invalid file type. Only PDF, Excel, CSV, and image files are allowed.', ErrorCodes.VALIDATION_ERROR);
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // SECURITY: Verify file signature (magic numbers) to prevent MIME type spoofing
    const detectedType = await fileTypeFromBuffer(buffer);
    if (!detectedType) {
      throw new AppError(400, 'Unable to determine file type. File may be corrupted.', ErrorCodes.VALIDATION_ERROR);
    }

    if (!ALLOWED_TYPES.includes(detectedType.mime)) {
      logger.warn('File type mismatch detected', {
        declaredType: file.type,
        detectedType: detectedType.mime,
        userId: user.id,
        clientId: client.id,
      });
      throw new AppError(400, 'File type verification failed. The file does not match its declared type.', ErrorCodes.VALIDATION_ERROR);
    }

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads', 'analytics', client.id.toString());
    await fs.mkdir(uploadDir, { recursive: true });

    // SECURITY: Generate safe filename - remove original extension and use verified one
    const timestamp = Date.now();
    const safeBaseName = file.name
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[^a-zA-Z0-9-]/g, '_') // Sanitize
      .substring(0, 100); // Limit length
    const fileName = `${timestamp}_${safeBaseName}.${detectedType.ext}`;
    const filePath = path.join(uploadDir, fileName);

    // Save file to disk
    await fs.writeFile(filePath, buffer);

    // Extract financial data from document
    let extractedData = null;
    try {
      // Use DocumentExtractor to extract data from PDF/Excel
      if (file.type.includes('pdf') || file.type.includes('sheet') || file.type.includes('excel')) {
        const extraction = await DocumentExtractor.extractFromDocument(filePath, 'Financial document for credit analysis');
        extractedData = {
          summary: extraction.summary,
          data: extraction.structuredData,
          confidence: extraction.confidence,
          warnings: extraction.warnings,
        };
      }
    } catch (extractError) {
      logger.warn('Failed to extract data from document', { error: extractError, fileName: file.name });
      // Continue without extraction - not critical
    }

    // Create document record with explicit field mapping
    const document = await prisma.clientAnalyticsDocument.create({
      data: {
        clientId: client.id,
        documentType,
        fileName: file.name,
        filePath,
        fileSize: file.size,
        uploadedBy: user.email!,
        extractedData: extractedData ? JSON.stringify(extractedData) : null,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        clientId: true,
        documentType: true,
        fileName: true,
        filePath: true,
        fileSize: true,
        uploadedBy: true,
        uploadedAt: true,
        extractedData: true,
        updatedAt: true,
      },
    });

    logger.info('Analytics document uploaded', {
      documentId: document.id,
      clientId: client.id,
      fileName: file.name,
      uploadedBy: user.email,
    });

    return NextResponse.json(successResponse(document), { status: 201 });
  },
});















































