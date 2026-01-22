import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { canApproveEngagementLetter } from '@/lib/services/tasks/taskAuthorization';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError, AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { toTaskId } from '@/types/branded';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { invalidateClientCache } from '@/lib/services/cache/cacheInvalidation';
import { invalidateTaskListCache } from '@/lib/services/cache/listCache';
import { uploadDpa } from '@/lib/services/documents/blobStorage';
import { extractDpaMetadata } from '@/lib/services/documents/dpaExtraction';
import { logger } from '@/lib/utils/logger';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

/**
 * POST /api/tasks/[id]/dpa
 * Upload Data Processing Agreement (DPA)
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
    const taskId = toTaskId(id);

    // Check if user can approve/upload DPA (same permissions as engagement letter)
    // Rules: SYSTEM_ADMIN OR Partner/Administrator (ServiceLineUser.role = ADMINISTRATOR or PARTNER for project's service line)
    const hasApprovalPermission = await canApproveEngagementLetter(user.id, taskId);

    if (!hasApprovalPermission) {
      return NextResponse.json(
        { error: 'Only Partners and System Administrators can upload Data Processing Agreements' },
        { status: 403 }
      );
    }

    // Get task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        GSClientID: true,
        TaskAcceptance: {
          select: {
            acceptanceApproved: true,
          },
        },
        TaskEngagementLetter: {
          select: {
            uploaded: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!task.GSClientID) {
      return NextResponse.json(
        { error: 'Data Processing Agreement is only available for client tasks' },
        { status: 400 }
      );
    }

    if (!task.TaskAcceptance?.acceptanceApproved) {
      return NextResponse.json(
        { error: 'Client acceptance must be approved before uploading DPA' },
        { status: 400 }
      );
    }

    if (!task.TaskEngagementLetter?.uploaded) {
      return NextResponse.json(
        { error: 'Engagement letter must be uploaded before uploading DPA' },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type (PDF only for intelligent extraction)
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are supported for intelligent extraction' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract and validate metadata from DPA PDF
    let extractionResult;
    try {
      logger.info('Starting DPA extraction', { taskId, userId: user.id });
      extractionResult = await extractDpaMetadata(buffer, taskId);
      
      if (!extractionResult.isValid) {
        logger.warn('DPA validation failed', {
          taskId,
          errors: extractionResult.errors,
        });
        
        return NextResponse.json(
          {
            error: 'DPA validation failed',
            details: extractionResult.errors,
            requirements: [
              'Partner/firm signature on DPA',
              'Client signature on DPA',
              'Valid DPA date',
              'Identifiable signing partner/representative',
            ],
          },
          { status: 400 }
        );
      }
    } catch (error) {
      logger.error('DPA extraction error', { taskId, error });
      
      // Save extraction failure to database
      await prisma.taskEngagementLetter.upsert({
        where: { taskId },
        create: {
          taskId,
          dpaUploaded: false,
          dpaExtractionStatus: 'FAILED',
          dpaExtractionError: error instanceof Error ? error.message : 'Unknown extraction error',
          updatedAt: new Date(),
        },
        update: {
          dpaExtractionStatus: 'FAILED',
          dpaExtractionError: error instanceof Error ? error.message : 'Unknown extraction error',
          updatedAt: new Date(),
        },
      });
      
      return NextResponse.json(
        {
          error: 'DPA document processing failed',
          technicalError: error instanceof Error ? error.message : 'Unknown error',
          details: [
            'Document may be an image-based PDF (not searchable text)',
            'Document may be corrupted',
            'File may not be a valid PDF',
          ],
          suggestions: [
            'Ensure the PDF contains searchable text (not just images)',
            'Re-save the document as PDF from the original application',
            'Contact support if the issue persists',
          ],
        },
        { status: 400 }
      );
    }

    // Upload to Azure Blob Storage
    const blobPath = await uploadDpa(buffer, file.name, taskId);

    // Update or create TaskEngagementLetter (add DPA fields with extracted metadata)
    const updatedEngagementLetter = await prisma.taskEngagementLetter.upsert({
      where: { taskId },
      create: {
        taskId,
        dpaUploaded: true,
        dpaFilePath: blobPath,
        dpaUploadedBy: user.id,
        dpaUploadedAt: new Date(),
        dpaExtractionStatus: 'SUCCESS',
        dpaLetterDate: extractionResult.dpaDate,
        dpaLetterAge: extractionResult.dpaAge,
        dpaSigningPartner: extractionResult.signingPartner,
        dpaSigningPartnerCode: extractionResult.partnerCode,
        dpaHasPartnerSignature: extractionResult.hasPartnerSignature,
        dpaHasClientSignature: extractionResult.hasClientSignature,
        dpaExtractedText: extractionResult.extractedText,
        updatedAt: new Date(),
      },
      update: {
        dpaUploaded: true,
        dpaFilePath: blobPath,
        dpaUploadedBy: user.id,
        dpaUploadedAt: new Date(),
        dpaExtractionStatus: 'SUCCESS',
        dpaLetterDate: extractionResult.dpaDate,
        dpaLetterAge: extractionResult.dpaAge,
        dpaSigningPartner: extractionResult.signingPartner,
        dpaSigningPartnerCode: extractionResult.partnerCode,
        dpaHasPartnerSignature: extractionResult.hasPartnerSignature,
        dpaHasClientSignature: extractionResult.hasClientSignature,
        dpaExtractedText: extractionResult.extractedText,
        updatedAt: new Date(),
      },
      select: {
        dpaUploaded: true,
        dpaFilePath: true,
        dpaUploadedBy: true,
        dpaUploadedAt: true,
        dpaExtractionStatus: true,
        dpaLetterDate: true,
        dpaLetterAge: true,
        dpaSigningPartner: true,
        dpaSigningPartnerCode: true,
        dpaHasPartnerSignature: true,
        dpaHasClientSignature: true,
      },
    });

    // Invalidate task cache to ensure fresh data on next fetch
    await cache.invalidatePattern(`${CACHE_PREFIXES.TASK}detail:${taskId}:*`);
    await invalidateTaskListCache(taskId);
    
    if (task.GSClientID) {
      await invalidateClientCache(task.GSClientID);
    }

    return NextResponse.json(
      successResponse({
        dpaUploaded: updatedEngagementLetter.dpaUploaded,
        dpaFilePath: updatedEngagementLetter.dpaFilePath,
        dpaUploadedBy: updatedEngagementLetter.dpaUploadedBy,
        dpaUploadedAt: updatedEngagementLetter.dpaUploadedAt,
        extractionStatus: updatedEngagementLetter.dpaExtractionStatus,
        extractedMetadata: {
          dpaDate: updatedEngagementLetter.dpaLetterDate,
          dpaAge: updatedEngagementLetter.dpaLetterAge,
          signingPartner: updatedEngagementLetter.dpaSigningPartner,
          partnerCode: updatedEngagementLetter.dpaSigningPartnerCode,
          hasPartnerSignature: updatedEngagementLetter.dpaHasPartnerSignature,
          hasClientSignature: updatedEngagementLetter.dpaHasClientSignature,
        },
      }),
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/tasks/[id]/dpa');
  }
}

/**
 * GET /api/tasks/[id]/dpa
 * Get DPA status
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  handler: async (request: NextRequest, { user, params }) => {
    const taskId = toTaskId(params.id);

    // Get task DPA info
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        TaskEngagementLetter: {
          select: {
            dpaUploaded: true,
            dpaFilePath: true,
            dpaUploadedBy: true,
            dpaUploadedAt: true,
          },
        },
      },
    });

    if (!task) {
      throw new AppError(404, 'Task not found', ErrorCodes.NOT_FOUND);
    }

    const engagementLetter = task.TaskEngagementLetter;
    return NextResponse.json(
      successResponse({
        dpaUploaded: engagementLetter?.dpaUploaded ?? false,
        dpaFilePath: engagementLetter?.dpaFilePath ?? null,
        dpaUploadedBy: engagementLetter?.dpaUploadedBy ?? null,
        dpaUploadedAt: engagementLetter?.dpaUploadedAt ?? null,
      }),
      { headers: { 'Cache-Control': 'no-store' } }
    );
  },
});

