import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, checkClientAccess } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { DocumentExtractor } from '@/lib/services/documents/documentExtractor';
import { logger } from '@/lib/utils/logger';
import path from 'node:path';
import fs from 'fs/promises';
import { fileTypeFromBuffer } from 'file-type';
import { GSClientIDSchema } from '@/lib/validation/schemas';

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
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const GSClientID = id;

    // Validate GSClientID is a valid GUID
    const validationResult = GSClientIDSchema.safeParse(GSClientID);
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid client ID format. Expected GUID.' }, { status: 400 });
    }

    // SECURITY: Check authorization - user must have access to this client
    const hasAccess = await checkClientAccess(user.id, GSClientID);
    if (!hasAccess) {
      logger.warn('Unauthorized client access attempt', {
        userId: user.id,
        userEmail: user.email,
        GSClientID,
        action: 'GET /analytics/documents',
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify client exists and get numeric id
    const client = await prisma.client.findUnique({
      where: { GSClientID: GSClientID },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Fetch all analytics documents for this client (using numeric id)
    const documents = await prisma.clientAnalyticsDocument.findMany({
      where: { clientId: client.id },
      orderBy: { uploadedAt: 'desc' },
    });

    return NextResponse.json(
      successResponse({
        documents,
        totalCount: documents.length,
      })
    );
  } catch (error) {
    return handleApiError(error, 'GET /api/clients/[id]/analytics/documents');
  }
}

/**
 * POST /api/clients/[id]/analytics/documents
 * Upload a new analytics document
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const GSClientID = id;

    // Validate GSClientID is a valid GUID
    const validationResult = GSClientIDSchema.safeParse(GSClientID);
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid client ID format. Expected GUID.' }, { status: 400 });
    }

    // SECURITY: Check authorization
    const hasAccess = await checkClientAccess(user.id, GSClientID);
    if (!hasAccess) {
      logger.warn('Unauthorized document upload attempt', {
        userId: user.id,
        userEmail: user.email,
        GSClientID,
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify client exists and get numeric id
    const client = await prisma.client.findUnique({
      where: { GSClientID: GSClientID },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = (formData.get('documentType') as string) || 'OTHER';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate MIME type from header
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, Excel, CSV, and image files are allowed.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // SECURITY: Verify file signature (magic numbers) to prevent MIME type spoofing
    const detectedType = await fileTypeFromBuffer(buffer);
    if (!detectedType) {
      return NextResponse.json(
        { error: 'Unable to determine file type. File may be corrupted.' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(detectedType.mime)) {
      logger.warn('File type mismatch detected', {
        declaredType: file.type,
        detectedType: detectedType.mime,
        userId: user.id,
        clientId: client.id,
      });
      return NextResponse.json(
        { error: 'File type verification failed. The file does not match its declared type.' },
        { status: 400 }
      );
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

    // Create document record
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
    });

    logger.info('Analytics document uploaded', {
      documentId: document.id,
      GSClientID: client.id,
      fileName: file.name,
      uploadedBy: user.email,
    });

    return NextResponse.json(successResponse(document), { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/clients/[id]/analytics/documents');
  }
}




















