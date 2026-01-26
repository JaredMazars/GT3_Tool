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
import { uploadEngagementLetter } from '@/lib/services/documents/blobStorage';
import { extractEngagementLetterMetadata } from '@/lib/services/documents/engagementLetterExtraction';
import { logger } from '@/lib/utils/logger';
import { secureRoute, Feature } from '@/lib/api/secureRoute';

/**
 * POST /api/tasks/[id]/engagement-letter
 * Upload signed engagement letter
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

    // Check if user can approve/upload engagement letter
    // Rules: SYSTEM_ADMIN OR Partner/Administrator (ServiceLineUser.role = ADMINISTRATOR or PARTNER for project's service line)
    const hasApprovalPermission = await canApproveEngagementLetter(user.id, taskId);

    if (!hasApprovalPermission) {
      return NextResponse.json(
        { error: 'Only Partners and System Administrators can upload engagement letters' },
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
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!task.GSClientID) {
      return NextResponse.json(
        { error: 'Engagement letter is only available for client tasks' },
        { status: 400 }
      );
    }

    if (!task.TaskAcceptance?.acceptanceApproved) {
      return NextResponse.json(
        { error: 'Client acceptance must be approved before uploading engagement letter' },
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

    // Extract and validate metadata from PDF
    let extractionResult;
    try {
      logger.info('Starting engagement letter extraction', { taskId, userId: user.id });
      extractionResult = await extractEngagementLetterMetadata(buffer, taskId);
      
      if (!extractionResult.isValid) {
        logger.warn('Engagement letter validation failed', {
          taskId,
          errors: extractionResult.errors,
        });
        
        // Build detailed error message
        const signatureErrors = extractionResult.errors.filter(e => 
          e.includes('signature') || e.includes('Terms & Conditions')
        );
        const otherErrors = extractionResult.errors.filter(e => 
          !e.includes('signature') && !e.includes('Terms & Conditions')
        );
        
        return NextResponse.json(
          {
            error: 'Document validation failed - missing required information',
            message: signatureErrors.length > 0 
              ? 'The document must be signed by the partner and client on the main engagement letter, and by the client on the Terms & Conditions section (3 signatures minimum).'
              : 'The document is missing required information.',
            details: extractionResult.errors,
            requirements: {
              signatures: [
                '✓ Partner signature on main engagement letter (page 1)',
                '✓ Client signature on main engagement letter (page 2)',
                '✓ Separate "Standard Terms and Conditions" section on its own pages',
                '✓ Client signature at end of Terms & Conditions section (last page)',
                '⚬ Partner signature on T&C is optional',
              ],
              other: [
                '✓ Valid engagement letter date (within last 5 years)',
                '✓ Identifiable signing partner name',
                '✓ At least one service scope mentioned',
              ]
            },
            help: 'Ensure your PDF contains: 1) Searchable text (not scanned images), 2) A main engagement letter with partner signature on page 1 and client signature on page 2, 3) A separate "Standard Terms and Conditions" section (often 2-5 pages) with client signature at the end.',
          },
          { status: 400 }
        );
      }
    } catch (error) {
      logger.error('Engagement letter extraction error', { taskId, error });
      
      // Save extraction failure to database
      await prisma.taskEngagementLetter.upsert({
        where: { taskId },
        create: {
          taskId,
          uploaded: false,
          elExtractionStatus: 'FAILED',
          elExtractionError: error instanceof Error ? error.message : 'Unknown extraction error',
          updatedAt: new Date(),
        },
        update: {
          elExtractionStatus: 'FAILED',
          elExtractionError: error instanceof Error ? error.message : 'Unknown extraction error',
          updatedAt: new Date(),
        },
      });
      
      return NextResponse.json(
        {
          error: 'Document processing failed',
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
    const blobPath = await uploadEngagementLetter(buffer, file.name, taskId);

    // Update or create TaskEngagementLetter with extracted metadata
    const updatedEngagementLetter = await prisma.taskEngagementLetter.upsert({
      where: { taskId },
      create: {
        taskId,
        uploaded: true,
        filePath: blobPath,
        uploadedBy: user.id,
        uploadedAt: new Date(),
        elExtractionStatus: 'SUCCESS',
        elLetterDate: extractionResult.letterDate,
        elLetterAge: extractionResult.letterAge,
        elSigningPartner: extractionResult.signingPartner,
        elSigningPartnerCode: extractionResult.partnerCode,
        elServicesCovered: JSON.stringify(extractionResult.services),
        elHasPartnerSignature: extractionResult.hasPartnerSignature,
        elHasClientSignature: extractionResult.hasClientSignature,
        elHasTermsConditions: extractionResult.hasTermsConditions,
        elHasTcPartnerSignature: extractionResult.hasTcPartnerSignature,
        elHasTcClientSignature: extractionResult.hasTcClientSignature,
        elExtractedText: extractionResult.extractedText,
        updatedAt: new Date(),
      },
      update: {
        uploaded: true,
        filePath: blobPath,
        uploadedBy: user.id,
        uploadedAt: new Date(),
        elExtractionStatus: 'SUCCESS',
        elLetterDate: extractionResult.letterDate,
        elLetterAge: extractionResult.letterAge,
        elSigningPartner: extractionResult.signingPartner,
        elSigningPartnerCode: extractionResult.partnerCode,
        elServicesCovered: JSON.stringify(extractionResult.services),
        elHasPartnerSignature: extractionResult.hasPartnerSignature,
        elHasClientSignature: extractionResult.hasClientSignature,
        elHasTermsConditions: extractionResult.hasTermsConditions,
        elHasTcPartnerSignature: extractionResult.hasTcPartnerSignature,
        elHasTcClientSignature: extractionResult.hasTcClientSignature,
        elExtractedText: extractionResult.extractedText,
        updatedAt: new Date(),
      },
      select: {
        uploaded: true,
        filePath: true,
        uploadedBy: true,
        uploadedAt: true,
        elExtractionStatus: true,
        elLetterDate: true,
        elLetterAge: true,
        elSigningPartner: true,
        elSigningPartnerCode: true,
        elServicesCovered: true,
        elHasPartnerSignature: true,
        elHasClientSignature: true,
        elHasTermsConditions: true,
        elHasTcPartnerSignature: true,
        elHasTcClientSignature: true,
      },
    });

    // Invalidate caches to ensure fresh data on next fetch
    await cache.invalidatePattern(`${CACHE_PREFIXES.TASK}detail:${taskId}:*`);
    await invalidateTaskListCache(taskId);
    
    if (task.GSClientID) {
      await invalidateClientCache(task.GSClientID);
    }

    return NextResponse.json(
      successResponse({
        uploaded: updatedEngagementLetter.uploaded,
        filePath: updatedEngagementLetter.filePath,
        uploadedBy: updatedEngagementLetter.uploadedBy,
        uploadedAt: updatedEngagementLetter.uploadedAt,
        extractionStatus: updatedEngagementLetter.elExtractionStatus,
        extractedMetadata: {
          letterDate: updatedEngagementLetter.elLetterDate,
          letterAge: updatedEngagementLetter.elLetterAge,
          signingPartner: updatedEngagementLetter.elSigningPartner,
          partnerCode: updatedEngagementLetter.elSigningPartnerCode,
          servicesCovered: updatedEngagementLetter.elServicesCovered 
            ? JSON.parse(updatedEngagementLetter.elServicesCovered)
            : [],
          hasPartnerSignature: updatedEngagementLetter.elHasPartnerSignature,
          hasClientSignature: updatedEngagementLetter.elHasClientSignature,
          hasTermsConditions: updatedEngagementLetter.elHasTermsConditions,
          hasTcPartnerSignature: updatedEngagementLetter.elHasTcPartnerSignature,
          hasTcClientSignature: updatedEngagementLetter.elHasTcClientSignature,
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
    return handleApiError(error, 'POST /api/tasks/[id]/engagement-letter');
  }
}

/**
 * GET /api/tasks/[id]/engagement-letter
 * Get engagement letter status
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  handler: async (request: NextRequest, { user, params }) => {
    const taskId = toTaskId(params.id);

    // Get task engagement letter
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        TaskEngagementLetter: {
          select: {
            generated: true,
            uploaded: true,
            filePath: true,
            uploadedBy: true,
            uploadedAt: true,
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
        engagementLetterGenerated: engagementLetter?.generated ?? false,
        engagementLetterUploaded: engagementLetter?.uploaded ?? false,
        engagementLetterPath: engagementLetter?.filePath ?? null,
        engagementLetterUploadedBy: engagementLetter?.uploadedBy ?? null,
        engagementLetterUploadedAt: engagementLetter?.uploadedAt ?? null,
      }),
      { headers: { 'Cache-Control': 'no-store' } }
    );
  },
});


