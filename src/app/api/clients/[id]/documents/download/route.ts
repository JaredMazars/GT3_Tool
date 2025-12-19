import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { DocumentType } from '@/types';
import { readFile } from 'fs/promises';
import path from 'node:path';
import { GSClientIDSchema } from '@/lib/validation/schemas';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/clients/[id]/documents/download
 * Download a document for a client
 * Query params: documentType, documentId, taskId
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get('documentType') as DocumentType;
    const documentId = Number.parseInt(searchParams.get('documentId') || '');
    const taskId = Number.parseInt(searchParams.get('taskId') || '');

    if (!documentType || Number.isNaN(documentId)) {
      return NextResponse.json(
        { error: 'Missing required parameters: documentType, documentId' },
        { status: 400 }
      );
    }

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { GSClientID: GSClientID },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get file path based on document type
    let filePath: string | null = null;
    let fileName: string | null = null;

    switch (documentType) {
      case DocumentType.ENGAGEMENT_LETTER: {
        const task = await prisma.task.findFirst({
          where: {
            id: taskId,
            Client: {
              GSClientID: GSClientID,
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
          return NextResponse.json(
            { error: 'Engagement letter not found' },
            { status: 404 }
          );
        }

        filePath = task.TaskEngagementLetter.filePath;
        // Extract filename from path, handling both forward and backward slashes
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
                GSClientID: GSClientID,
              },
            },
          },
        });

        if (!doc) {
          return NextResponse.json(
            { error: 'Administration document not found' },
            { status: 404 }
          );
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
                GSClientID: GSClientID,
              },
            },
          },
        });

        if (!doc) {
          return NextResponse.json(
            { error: 'Adjustment document not found' },
            { status: 404 }
          );
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
                  GSClientID: GSClientID,
                },
              },
            },
          },
        });

        if (!doc) {
          return NextResponse.json(
            { error: 'Opinion document not found' },
            { status: 404 }
          );
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
                GSClientID: GSClientID,
              },
            },
          },
        });

        if (!doc || !doc.documentPath) {
          return NextResponse.json(
            { error: 'SARS document not found' },
            { status: 404 }
          );
        }

        filePath = doc.documentPath;
        // Extract filename from path, handling both forward and backward slashes
        const sarsPathParts = filePath.split(/[/\\]/);
        fileName = sarsPathParts[sarsPathParts.length - 1] || 'sars-document.pdf';
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Invalid document type' },
          { status: 400 }
        );
    }

    if (!filePath) {
      return NextResponse.json(
        { error: 'Document file path not found' },
        { status: 404 }
      );
    }

    // Read the file
    const fullPath = path.join(process.cwd(), filePath);
    let fileBuffer: Buffer;
    try {
      fileBuffer = await readFile(fullPath);
    } catch (fileError) {
      logger.error('File read error', fileError);
      return NextResponse.json(
        { error: 'Document file not found on server', details: filePath },
        { status: 404 }
      );
    }

    // Determine content type based on file extension
    const ext = filePath.split('.').pop()?.toLowerCase();
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

    // Return file with proper headers
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/clients/[id]/documents/download');
  }
}

