import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { parseGSClientID, parseNumericId } from '@/lib/utils/apiUtils';
import { DocumentType } from '@/types';
import { readFile } from 'fs/promises';
import path from 'node:path';
import { logger } from '@/lib/utils/logger';

// Zod schema for query parameter validation
const DownloadQuerySchema = z.object({
  documentType: z.nativeEnum(DocumentType),
  documentId: z.string().regex(/^\d+$/, 'Document ID must be a positive integer'),
  taskId: z.string().regex(/^\d+$/, 'Task ID must be a positive integer').optional(),
});

// Allowed base directories for document storage (prevents path traversal)
const ALLOWED_BASE_DIRS = [
  'uploads',
  'documents',
  'storage',
];

/**
 * Validate that a file path is within allowed directories
 * Prevents path traversal attacks
 */
function validateFilePath(filePath: string): string {
  // Normalize the path to resolve .. and . segments
  const normalizedPath = path.normalize(filePath);
  
  // Check for path traversal attempts
  if (normalizedPath.includes('..') || normalizedPath.startsWith('/') || normalizedPath.startsWith('\\')) {
    throw new AppError(
      403,
      'Invalid document path',
      ErrorCodes.FORBIDDEN,
      { reason: 'Path traversal attempt detected' }
    );
  }
  
  // Verify the path starts with an allowed base directory
  const pathParts = normalizedPath.split(/[/\\]/);
  const baseDir = pathParts[0];
  
  if (!baseDir || !ALLOWED_BASE_DIRS.includes(baseDir)) {
    throw new AppError(
      403,
      'Document not accessible',
      ErrorCodes.FORBIDDEN,
      { reason: 'Document is not in an allowed directory' }
    );
  }
  
  return normalizedPath;
}

/**
 * GET /api/clients/[id]/documents/download
 * Download a document for a client
 * Query params: documentType, documentId, taskId
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_CLIENTS,
  handler: async (request: NextRequest, { user, params }) => {
    // Parse and validate GSClientID
    const GSClientID = parseGSClientID(params.id);

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryResult = DownloadQuerySchema.safeParse({
      documentType: searchParams.get('documentType'),
      documentId: searchParams.get('documentId'),
      taskId: searchParams.get('taskId'),
    });

    if (!queryResult.success) {
      const message = queryResult.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      throw new AppError(
        400,
        `Invalid query parameters: ${message}`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const { documentType, documentId: documentIdStr, taskId: taskIdStr } = queryResult.data;
    const documentId = parseNumericId(documentIdStr, 'Document');
    const taskId = taskIdStr ? parseNumericId(taskIdStr, 'Task') : undefined;

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { GSClientID },
      select: { GSClientID: true },
    });

    if (!client) {
      throw new AppError(404, 'Client not found', ErrorCodes.NOT_FOUND);
    }

    // Get file path based on document type
    let filePath: string | null = null;
    let fileName: string | null = null;

    switch (documentType) {
      case DocumentType.ENGAGEMENT_LETTER: {
        if (!taskId) {
          throw new AppError(
            400,
            'Task ID is required for engagement letter download',
            ErrorCodes.VALIDATION_ERROR
          );
        }
        const task = await prisma.task.findFirst({
          where: {
            id: taskId,
            Client: {
              GSClientID,
            },
          },
          select: {
            TaskEngagementLetter: {
              select: {
                filePath: true,
                uploaded: true,
              },
            },
          },
        });

        if (!task || !task.TaskEngagementLetter || !task.TaskEngagementLetter.uploaded || !task.TaskEngagementLetter.filePath) {
          throw new AppError(404, 'Engagement letter not found', ErrorCodes.NOT_FOUND);
        }

        filePath = task.TaskEngagementLetter.filePath;
        const pathParts = filePath.split(/[/\\]/);
        fileName = pathParts[pathParts.length - 1] || 'engagement-letter.pdf';
        break;
      }

      case DocumentType.ADMINISTRATION: {
        const doc = await prisma.taskDocument.findFirst({
          where: {
            id: documentId,
            Task: {
              Client: {
                GSClientID,
              },
            },
          },
          select: {
            filePath: true,
            fileName: true,
          },
        });

        if (!doc) {
          throw new AppError(404, 'Administration document not found', ErrorCodes.NOT_FOUND);
        }

        filePath = doc.filePath;
        fileName = doc.fileName;
        break;
      }

      case DocumentType.ADJUSTMENT: {
        const doc = await prisma.adjustmentDocument.findFirst({
          where: {
            id: documentId,
            Task: {
              Client: {
                GSClientID,
              },
            },
          },
          select: {
            filePath: true,
            fileName: true,
          },
        });

        if (!doc) {
          throw new AppError(404, 'Adjustment document not found', ErrorCodes.NOT_FOUND);
        }

        filePath = doc.filePath;
        fileName = doc.fileName;
        break;
      }

      case DocumentType.OPINION: {
        const doc = await prisma.opinionDocument.findFirst({
          where: {
            id: documentId,
            OpinionDraft: {
              Task: {
                Client: {
                  GSClientID,
                },
              },
            },
          },
          select: {
            filePath: true,
            fileName: true,
          },
        });

        if (!doc) {
          throw new AppError(404, 'Opinion document not found', ErrorCodes.NOT_FOUND);
        }

        filePath = doc.filePath;
        fileName = doc.fileName;
        break;
      }

      case DocumentType.SARS: {
        const doc = await prisma.sarsResponse.findFirst({
          where: {
            id: documentId,
            Task: {
              Client: {
                GSClientID,
              },
            },
          },
          select: {
            documentPath: true,
          },
        });

        if (!doc || !doc.documentPath) {
          throw new AppError(404, 'SARS document not found', ErrorCodes.NOT_FOUND);
        }

        filePath = doc.documentPath;
        const sarsPathParts = filePath.split(/[/\\]/);
        fileName = sarsPathParts[sarsPathParts.length - 1] || 'sars-document.pdf';
        break;
      }

      default:
        throw new AppError(400, 'Invalid document type', ErrorCodes.VALIDATION_ERROR);
    }

    if (!filePath) {
      throw new AppError(404, 'Document file path not found', ErrorCodes.NOT_FOUND);
    }

    // Validate file path to prevent path traversal attacks
    const validatedPath = validateFilePath(filePath);
    const fullPath = path.join(process.cwd(), validatedPath);

    // Read the file
    let fileBuffer: Buffer;
    try {
      fileBuffer = await readFile(fullPath);
    } catch (fileError) {
      logger.error('File read error', { path: validatedPath, error: fileError });
      throw new AppError(
        404,
        'Document file not found on server',
        ErrorCodes.NOT_FOUND
      );
    }

    // Log document download for audit trail
    logger.info('Document downloaded', {
      userId: user.id,
      clientId: GSClientID,
      documentType,
      documentId,
      fileName,
    });

    // Determine content type based on file extension
    const ext = validatedPath.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (ext === 'pdf') {
      contentType = 'application/pdf';
    } else if (ext === 'docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (ext === 'doc') {
      contentType = 'application/msword';
    } else if (ext === 'xlsx') {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (ext === 'xls') {
      contentType = 'application/vnd.ms-excel';
    } else if (ext === 'csv') {
      contentType = 'text/csv';
    } else if (ext === 'txt') {
      contentType = 'text/plain';
    }

    // Return file with proper headers including security headers
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
        'X-Content-Type-Options': 'nosniff', // Prevent MIME type sniffing
        'Cache-Control': 'no-store', // Don't cache file downloads
      },
    });
  },
});
