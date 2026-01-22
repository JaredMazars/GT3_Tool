import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { SectionGenerator, SectionGenerationState } from '@/lib/tools/tax-opinion/agents/sectionGenerator';
import { logger } from '@/lib/utils/logger';
import { uploadFile } from '@/lib/services/documents/blobStorage';
import { ragEngine } from '@/lib/tools/tax-opinion/services/ragEngine';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { parseTaskId, parseNumericId, successResponse } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import {
  StartSectionSchema,
  AnswerQuestionSchema,
  GenerateContentSchema,
  RegenerateSchema,
  CreateManualSectionSchema,
  RefreshContextSchema,
  ReorderSectionsSchema,
  UpdateSingleSectionSchema,
} from '@/lib/validation/schemas';
import { z } from 'zod';

// Maximum file size for document uploads: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Helper to verify draft belongs to task
async function verifyDraftBelongsToTask(draftId: number, taskId: number): Promise<void> {
  const draft = await prisma.opinionDraft.findFirst({
    where: { id: draftId, taskId },
    select: { id: true },
  });
  
  if (!draft) {
    throw new AppError(404, 'Opinion draft not found or does not belong to this task', ErrorCodes.NOT_FOUND);
  }
}

/**
 * GET /api/tasks/[id]/opinion-drafts/[draftId]/sections
 * Get all sections for an opinion draft
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);
    const draftId = parseNumericId(params.draftId, 'Draft ID');

    // Verify IDOR protection
    await verifyDraftBelongsToTask(draftId, taskId);

    const sections = await prisma.opinionSection.findMany({
      where: { opinionDraftId: draftId },
      select: {
        id: true,
        opinionDraftId: true,
        sectionType: true,
        title: true,
        content: true,
        order: true,
        aiGenerated: true,
        reviewed: true,
        reviewedBy: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { order: 'asc' },
        { id: 'asc' },
      ],
      take: 100,
    });

    logger.info('Opinion sections fetched', { userId: user.id, taskId, draftId, count: sections.length });

    return NextResponse.json(successResponse(sections), {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  },
});

/**
 * POST /api/tasks/[id]/opinion-drafts/[draftId]/sections
 * Handle interactive section creation with Q&A flow
 * This endpoint handles multiple actions via the `action` field
 */
export const POST = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);
    const draftId = parseNumericId(params.draftId, 'Draft ID');

    // Verify IDOR protection
    await verifyDraftBelongsToTask(draftId, taskId);

    // Parse body to determine action
    const body = await request.json();
    const { action } = body;

    if (!action) {
      throw new AppError(400, 'Action required', ErrorCodes.VALIDATION_ERROR);
    }

    // Handle different actions with proper validation
    switch (action) {
      case 'start_section': {
        // Validate input
        const data = StartSectionSchema.parse(body);

        const result = await SectionGenerator.startSection(
          data.sectionType,
          draftId,
          data.customTitle
        );

        logger.info('Section creation started', { 
          userId: user.id, 
          taskId, 
          draftId, 
          sectionType: data.sectionType 
        });

        return NextResponse.json(
          successResponse({
            question: result.question,
            state: result.state,
            message: 'Section creation started',
          })
        );
      }

      case 'answer_question': {
        // Validate input
        const data = AnswerQuestionSchema.parse(body);

        const result = await SectionGenerator.answerQuestion(
          data.state as SectionGenerationState,
          data.answer,
          draftId
        );

        logger.info('Question answered', { 
          userId: user.id, 
          taskId, 
          draftId, 
          complete: result.complete 
        });

        return NextResponse.json(
          successResponse({
            question: result.question,
            complete: result.complete,
            state: result.state,
            message: result.complete ? 'Questions complete' : 'Next question',
          })
        );
      }

      case 'generate_content': {
        // Validate input
        const data = GenerateContentSchema.parse(body);
        const generationState = data.state as SectionGenerationState;
        
        // Get all existing sections with explicit select
        const previousSections = await prisma.opinionSection.findMany({
          where: { opinionDraftId: draftId },
          select: {
            id: true,
            opinionDraftId: true,
            sectionType: true,
            title: true,
            content: true,
            order: true,
            aiGenerated: true,
            reviewed: true,
            reviewedBy: true,
            reviewedAt: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { order: 'asc' },
        });

        const content = await SectionGenerator.generateContent(
          generationState,
          draftId,
          previousSections
        );

        // Get next order
        const maxOrder = await prisma.opinionSection.findFirst({
          where: { opinionDraftId: draftId },
          orderBy: { order: 'desc' },
          select: { order: true },
        });

        // Create the section with explicit field mapping
        const section = await prisma.opinionSection.create({
          data: {
            opinionDraftId: draftId,
            sectionType: generationState.sectionType,
            title: generationState.customTitle || generationState.sectionType,
            content,
            order: maxOrder ? maxOrder.order + 1 : 1,
            aiGenerated: true,
            reviewed: false,
            updatedAt: new Date(),
          },
          select: {
            id: true,
            opinionDraftId: true,
            sectionType: true,
            title: true,
            content: true,
            order: true,
            aiGenerated: true,
            reviewed: true,
            createdAt: true,
          },
        });

        logger.info('Section content generated', { 
          userId: user.id, 
          taskId, 
          draftId, 
          sectionId: section.id, 
          sectionType: generationState.sectionType 
        });

        return NextResponse.json(
          successResponse({
            data: section,
            message: 'Section generated successfully',
          })
        );
      }

      case 'regenerate': {
        // Validate input
        const data = RegenerateSchema.parse(body);

        const existingSection = await prisma.opinionSection.findUnique({
          where: { id: data.sectionId },
          select: {
            id: true,
            opinionDraftId: true,
            sectionType: true,
            title: true,
            order: true,
          },
        });

        if (!existingSection) {
          throw new AppError(404, 'Section not found', ErrorCodes.NOT_FOUND);
        }

        // Verify IDOR - section belongs to this draft
        if (existingSection.opinionDraftId !== draftId) {
          throw new AppError(403, 'Section does not belong to this draft', ErrorCodes.FORBIDDEN);
        }

        // Get all previous sections (before this one) with explicit select
        const previousSections = await prisma.opinionSection.findMany({
          where: { 
            opinionDraftId: draftId,
            order: { lt: existingSection.order },
          },
          select: {
            id: true,
            opinionDraftId: true,
            sectionType: true,
            title: true,
            content: true,
            order: true,
            aiGenerated: true,
            reviewed: true,
            reviewedBy: true,
            reviewedAt: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { order: 'asc' },
        });

        // Get section generation messages if they exist
        const sectionMessages = await prisma.opinionChatMessage.findMany({
          where: {
            opinionDraftId: draftId,
            sectionType: existingSection.sectionType,
          },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });

        // Create a pseudo-state from the section
        const pseudoState: SectionGenerationState = {
          sectionType: existingSection.sectionType,
          customTitle: existingSection.title,
          questions: sectionMessages.length > 0 
            ? [{ question: 'Regenerate section', answer: 'Yes' }]
            : [],
          currentQuestionIndex: 0,
          isComplete: true,
          generationId: `regen_${Date.now()}`,
          documentFindings: [], // Will be populated by generateContent if needed
        };

        const content = await SectionGenerator.generateContent(
          pseudoState,
          draftId,
          previousSections
        );

        // Update the section with explicit field mapping
        const updatedSection = await prisma.opinionSection.update({
          where: { id: data.sectionId },
          data: {
            content,
            aiGenerated: true,
            reviewed: false,
          },
          select: {
            id: true,
            opinionDraftId: true,
            sectionType: true,
            title: true,
            content: true,
            order: true,
            aiGenerated: true,
            reviewed: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        logger.info('Section regenerated', { 
          userId: user.id, 
          taskId, 
          draftId, 
          sectionId: data.sectionId 
        });

        return NextResponse.json(
          successResponse({
            data: updatedSection,
            message: 'Section regenerated successfully',
          })
        );
      }

      case 'create_manual': {
        // Validate input
        const data = CreateManualSectionSchema.parse(body);

        // Get next order if not provided
        const maxOrder = await prisma.opinionSection.findFirst({
          where: { opinionDraftId: draftId },
          orderBy: { order: 'desc' },
          select: { order: true },
        });

        const section = await prisma.opinionSection.create({
          data: {
            opinionDraftId: draftId,
            sectionType: data.sectionType || 'Custom',
            title: data.title,
            content: data.content,
            order: data.order ?? (maxOrder ? maxOrder.order + 1 : 1),
            aiGenerated: false,
            updatedAt: new Date(),
          },
          select: {
            id: true,
            opinionDraftId: true,
            sectionType: true,
            title: true,
            content: true,
            order: true,
            aiGenerated: true,
            reviewed: true,
            createdAt: true,
          },
        });

        logger.info('Manual section created', { 
          userId: user.id, 
          taskId, 
          draftId, 
          sectionId: section.id 
        });

        return NextResponse.json(
          successResponse({
            data: section,
            message: 'Section created successfully',
          })
        );
      }

      case 'upload_document_for_section': {
        // This is a special file upload case within the sections POST endpoint
        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const generationId = formData.get('generationId') as string;
        const category = (formData.get('category') as string) || 'Supporting Document';

        if (!file) {
          throw new AppError(400, 'File required', ErrorCodes.VALIDATION_ERROR);
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          throw new AppError(
            400,
            `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
            ErrorCodes.VALIDATION_ERROR
          );
        }

        // Validate file type
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ];

        if (!allowedTypes.includes(file.type)) {
          throw new AppError(
            400,
            'Invalid file type. Only PDF, Word, and text files are allowed.',
            ErrorCodes.VALIDATION_ERROR
          );
        }

        logger.info('Uploading document for section generation', { 
          userId: user.id, 
          taskId, 
          draftId, 
          fileName: file.name 
        });

        // Upload to blob storage
        const buffer = Buffer.from(await file.arrayBuffer());
        const filePath = await uploadFile(buffer, file.name, draftId);

        // Save document record with explicit field mapping
        const document = await prisma.opinionDocument.create({
          data: {
            opinionDraftId: draftId,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            filePath,
            category,
            uploadedBy: user.email,
          },
          select: {
            id: true,
            opinionDraftId: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            filePath: true,
            category: true,
            vectorized: true,
            createdAt: true,
          },
        });

        logger.info('Document saved to database', { 
          userId: user.id, 
          taskId, 
          draftId, 
          documentId: document.id 
        });

        // Immediately index document for RAG
        logger.info('Starting immediate indexing for document', { 
          userId: user.id, 
          taskId, 
          draftId, 
          documentId: document.id 
        });
        
        const indexed = await ragEngine.indexDocument(
          document.id,
          draftId,
          document.fileName,
          category,
          filePath,
          file.type
        );

        if (indexed) {
          // Update document as vectorized
          await prisma.opinionDocument.update({
            where: { id: document.id },
            data: {
              vectorized: true,
              extractedText: 'Processed',
            },
          });
          logger.info('Document indexed and vectorized', { 
            userId: user.id, 
            taskId, 
            draftId, 
            documentId: document.id, 
            fileName: document.fileName 
          });
        } else {
          logger.warn('Document uploaded but indexing failed', { 
            userId: user.id, 
            taskId, 
            draftId, 
            documentId: document.id, 
            fileName: document.fileName 
          });
        }

        return NextResponse.json(
          successResponse({
            data: document,
            indexed,
            message: indexed 
              ? 'Document uploaded and indexed successfully' 
              : 'Document uploaded but indexing is still processing',
          })
        );
      }

      case 'refresh_context': {
        // Validate input
        const data = RefreshContextSchema.parse(body);
        const generationState = data.state as SectionGenerationState;
        
        // Get previous sections with explicit select
        const previousSections = await prisma.opinionSection.findMany({
          where: { opinionDraftId: draftId },
          select: {
            id: true,
            opinionDraftId: true,
            sectionType: true,
            title: true,
            content: true,
            order: true,
            aiGenerated: true,
            reviewed: true,
            reviewedBy: true,
            reviewedAt: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { order: 'asc' },
        });

        // Build Q&A history for search
        const qaHistory = generationState.questions
          .filter(q => q.answer)
          .map(q => `${q.question} ${q.answer}`)
          .join(' ');

        // Re-search documents with current context
        logger.info('Refreshing document context', { 
          userId: user.id, 
          taskId, 
          draftId, 
          sectionType: generationState.sectionType 
        });
        
        // Dynamic import of ResearchAgent
        const { ResearchAgent } = await import('@/lib/tools/tax-opinion/agents/researchAgent');
        
        let searchQuery = '';
        switch (generationState.sectionType.toLowerCase()) {
          case 'facts':
            searchQuery = `factual circumstances background taxpayer details ${qaHistory}`;
            break;
          case 'issue':
            searchQuery = `tax issue question dispute assessment ${qaHistory}`;
            break;
          case 'law':
            searchQuery = `legislation sections regulations case law precedent ${qaHistory}`;
            break;
          case 'analysis':
          case 'application':
            const facts = previousSections.find(s => s.sectionType.toLowerCase() === 'facts')?.content || '';
            const issue = previousSections.find(s => s.sectionType.toLowerCase() === 'issue')?.content || '';
            searchQuery = `${issue} ${facts} ${qaHistory}`;
            break;
          case 'conclusion':
            searchQuery = `conclusion position recommendation ${qaHistory}`;
            break;
          default:
            searchQuery = `${generationState.sectionType} ${qaHistory}`;
        }

        const searchResult = await ResearchAgent.searchDocuments(draftId, searchQuery);
        
        // Update document findings
        const newFindings = searchResult.sources.map(source => ({
          content: source.excerpt || '',
          fileName: source.fileName,
          category: source.category,
          score: 0.8,
        }));

        // Merge with existing findings (avoid duplicates)
        const existingFileNames = new Set(generationState.documentFindings.map(d => d.fileName));
        const uniqueNewFindings = newFindings.filter(d => !existingFileNames.has(d.fileName));
        
        const updatedState = {
          ...generationState,
          documentFindings: [...generationState.documentFindings, ...uniqueNewFindings],
        };

        logger.info('Context refreshed', { 
          userId: user.id, 
          taskId, 
          draftId, 
          totalDocuments: updatedState.documentFindings.length, 
          newDocuments: uniqueNewFindings.length 
        });

        return NextResponse.json(
          successResponse({
            state: updatedState,
            message: `Found ${uniqueNewFindings.length} new document references`,
          })
        );
      }

      default:
        throw new AppError(400, `Invalid action: ${action}`, ErrorCodes.VALIDATION_ERROR);
    }
  },
});

/**
 * PUT /api/tasks/[id]/opinion-drafts/[draftId]/sections
 * Update a section or reorder sections
 */
export const PUT = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);
    const draftId = parseNumericId(params.draftId, 'Draft ID');

    // Verify IDOR protection
    await verifyDraftBelongsToTask(draftId, taskId);

    const body = await request.json();

    // Handle reorder operation
    if (body.reorderData) {
      const data = ReorderSectionsSchema.parse(body);

      // Verify all sections belong to this draft (IDOR protection)
      const sectionIds = data.reorderData.map(item => item.id);
      const sections = await prisma.opinionSection.findMany({
        where: { id: { in: sectionIds } },
        select: { id: true, opinionDraftId: true },
      });

      if (sections.length !== sectionIds.length) {
        throw new AppError(404, 'One or more sections not found', ErrorCodes.NOT_FOUND);
      }

      const invalidSection = sections.find(s => s.opinionDraftId !== draftId);
      if (invalidSection) {
        throw new AppError(403, 'One or more sections do not belong to this draft', ErrorCodes.FORBIDDEN);
      }

      // Batch update order
      await prisma.$transaction(
        data.reorderData.map((item) =>
          prisma.opinionSection.update({
            where: { id: item.id },
            data: { order: item.order },
          })
        )
      );

      logger.info('Sections reordered', { 
        userId: user.id, 
        taskId, 
        draftId, 
        sectionCount: data.reorderData.length 
      });

      return NextResponse.json(
        successResponse({
          message: 'Sections reordered successfully',
        })
      );
    }

    // Handle single section update
    const data = UpdateSingleSectionSchema.parse(body);

    // Verify section belongs to this draft (IDOR protection)
    const existingSection = await prisma.opinionSection.findUnique({
      where: { id: data.sectionId },
      select: { id: true, opinionDraftId: true },
    });

    if (!existingSection) {
      throw new AppError(404, 'Section not found', ErrorCodes.NOT_FOUND);
    }

    if (existingSection.opinionDraftId !== draftId) {
      throw new AppError(403, 'Section does not belong to this draft', ErrorCodes.FORBIDDEN);
    }

    // Build update data with explicit field mapping
    const updateData: {
      title?: string;
      content?: string;
      reviewed?: boolean;
      reviewedBy?: string;
      reviewedAt?: Date;
    } = {};
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.reviewed !== undefined) {
      updateData.reviewed = data.reviewed;
      if (data.reviewed) {
        updateData.reviewedBy = user.email;
        updateData.reviewedAt = new Date();
      }
    }

    const section = await prisma.opinionSection.update({
      where: { id: data.sectionId },
      data: updateData,
      select: {
        id: true,
        opinionDraftId: true,
        sectionType: true,
        title: true,
        content: true,
        order: true,
        aiGenerated: true,
        reviewed: true,
        reviewedBy: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info('Section updated', { 
      userId: user.id, 
      taskId, 
      draftId, 
      sectionId: data.sectionId, 
      fieldsUpdated: Object.keys(updateData) 
    });

    return NextResponse.json(
      successResponse({
        data: section,
        message: 'Section updated successfully',
      })
    );
  },
});

/**
 * DELETE /api/tasks/[id]/opinion-drafts/[draftId]/sections
 * Delete a section
 */
export const DELETE = secureRoute.mutationWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);
    const draftId = parseNumericId(params.draftId, 'Draft ID');

    // Verify IDOR protection
    await verifyDraftBelongsToTask(draftId, taskId);

    // Validate query parameter
    const { searchParams } = new URL(request.url);
    const sectionIdParam = searchParams.get('sectionId');

    if (!sectionIdParam) {
      throw new AppError(400, 'Section ID required', ErrorCodes.VALIDATION_ERROR);
    }

    const sectionId = parseNumericId(sectionIdParam, 'Section ID');

    // Verify section belongs to this draft (IDOR protection)
    const section = await prisma.opinionSection.findUnique({
      where: { id: sectionId },
      select: { id: true, opinionDraftId: true, title: true },
    });

    if (!section) {
      throw new AppError(404, 'Section not found', ErrorCodes.NOT_FOUND);
    }

    if (section.opinionDraftId !== draftId) {
      throw new AppError(403, 'Section does not belong to this draft', ErrorCodes.FORBIDDEN);
    }

    await prisma.opinionSection.delete({
      where: { id: sectionId },
    });

    logger.info('Section deleted', { 
      userId: user.id, 
      taskId, 
      draftId, 
      sectionId, 
      sectionTitle: section.title 
    });

    return NextResponse.json(
      successResponse({
        message: 'Section deleted successfully',
      })
    );
  },
});
