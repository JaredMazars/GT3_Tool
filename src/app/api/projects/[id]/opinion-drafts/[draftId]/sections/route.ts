import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SectionGenerator, SectionGenerationState } from '@/lib/agents/sectionGenerator';
import { logger } from '@/lib/logger';
import { uploadFile } from '@/lib/blobStorage';
import { ragEngine } from '@/lib/ragEngine';

/**
 * GET /api/projects/[id]/opinion-drafts/[draftId]/sections
 * Get all sections for an opinion draft
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; draftId: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const draftId = parseInt(params.draftId);

    const sections = await prisma.opinionSection.findMany({
      where: { opinionDraftId: draftId },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ success: true, data: sections });
  } catch (error) {
    logger.error('Error fetching sections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sections' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/opinion-drafts/[draftId]/sections
 * Handle interactive section creation with Q&A flow
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; draftId: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const draftId = parseInt(params.draftId);
    const projectId = parseInt(params.id);
    const body = await request.json();
    const { action, sectionType, customTitle, state, answer, sectionId, title, content, order } = body;

    // Verify draft exists
    const draft = await prisma.opinionDraft.findFirst({
      where: {
        id: draftId,
        projectId,
      },
    });

    if (!draft) {
      return NextResponse.json(
        { error: 'Opinion draft not found' },
        { status: 404 }
      );
    }

    // Handle different actions
    switch (action) {
      case 'start_section': {
        // Start interactive section creation
        if (!sectionType) {
          return NextResponse.json(
            { error: 'Section type required' },
            { status: 400 }
          );
        }

        const result = await SectionGenerator.startSection(
          sectionType,
          draftId,
          customTitle
        );

        return NextResponse.json({
          success: true,
          question: result.question,
          state: result.state,
          message: 'Section creation started',
        });
      }

      case 'answer_question': {
        // Process user's answer to agent question
        if (!state || !answer) {
          return NextResponse.json(
            { error: 'State and answer required' },
            { status: 400 }
          );
        }

        const result = await SectionGenerator.answerQuestion(
          state as SectionGenerationState,
          answer,
          draftId
        );

        return NextResponse.json({
          success: true,
          question: result.question,
          complete: result.complete,
          state: result.state,
          message: result.complete ? 'Questions complete' : 'Next question',
        });
      }

      case 'generate_content': {
        // Generate final content after Q&A complete
        if (!state) {
          return NextResponse.json(
            { error: 'State required' },
            { status: 400 }
          );
        }

        const generationState = state as SectionGenerationState;
        
        // Get all existing sections
        const previousSections = await prisma.opinionSection.findMany({
          where: { opinionDraftId: draftId },
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

        // Create the section
        const section = await prisma.opinionSection.create({
          data: {
            opinionDraftId: draftId,
            sectionType: generationState.sectionType,
            title: generationState.customTitle || generationState.sectionType,
            content,
            order: maxOrder ? maxOrder.order + 1 : 1,
            aiGenerated: true,
            reviewed: false,
          },
        });

        return NextResponse.json({
          success: true,
          data: section,
          message: 'Section generated successfully',
        });
      }

      case 'regenerate': {
        // Regenerate existing section with same context
        if (!sectionId) {
          return NextResponse.json(
            { error: 'Section ID required' },
            { status: 400 }
          );
        }

        const existingSection = await prisma.opinionSection.findUnique({
          where: { id: sectionId },
        });

        if (!existingSection) {
          return NextResponse.json(
            { error: 'Section not found' },
            { status: 404 }
          );
        }

        // Get all previous sections (before this one)
        const previousSections = await prisma.opinionSection.findMany({
          where: { 
            opinionDraftId: draftId,
            order: { lt: existingSection.order },
          },
          orderBy: { order: 'asc' },
        });

        // Get section generation messages if they exist
        const sectionMessages = await prisma.opinionChatMessage.findMany({
          where: {
            opinionDraftId: draftId,
            sectionType: existingSection.sectionType,
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

        // Update the section
        const updatedSection = await prisma.opinionSection.update({
          where: { id: sectionId },
          data: {
            content,
            aiGenerated: true,
            reviewed: false,
          },
        });

        return NextResponse.json({
          success: true,
          data: updatedSection,
          message: 'Section regenerated successfully',
        });
      }

      case 'create_manual': {
        // Create manual section without AI
        if (!title || !content) {
          return NextResponse.json(
            { error: 'Title and content required' },
            { status: 400 }
          );
        }

        // Get next order if not provided
        const maxOrder = await prisma.opinionSection.findFirst({
          where: { opinionDraftId: draftId },
          orderBy: { order: 'desc' },
          select: { order: true },
        });

        const section = await prisma.opinionSection.create({
          data: {
            opinionDraftId: draftId,
            sectionType: sectionType || 'Custom',
            title,
            content,
            order: order ?? (maxOrder ? maxOrder.order + 1 : 1),
            aiGenerated: false,
          },
        });

        return NextResponse.json({
          success: true,
          data: section,
          message: 'Section created successfully',
        });
      }

      case 'upload_document_for_section': {
        // Upload document during Q&A and immediately index it
        try {
          const formData = await request.formData();
          const file = formData.get('file') as File;
          const generationId = formData.get('generationId') as string;
          const category = (formData.get('category') as string) || 'Supporting Document';

          if (!file) {
            return NextResponse.json(
              { error: 'File required' },
              { status: 400 }
            );
          }

          logger.info(`📎 Uploading document for section generation: ${file.name}`);

          // Upload to blob storage
          const buffer = Buffer.from(await file.arrayBuffer());
          const filePath = await uploadFile(
            buffer,
            file.name,
            draftId
          );

          // Save document record
          const document = await prisma.opinionDocument.create({
            data: {
              opinionDraftId: draftId,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              filePath,
              category,
              uploadedBy: session.user.email!,
            },
          });

          logger.info(`✅ Document saved to database: ${document.id}`);

          // Immediately index document for RAG
          logger.info(`🔍 Starting immediate indexing for document: ${document.id}`);
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
            logger.info(`✅ Document indexed and vectorized: ${document.fileName}`);
          } else {
            logger.warn(`⚠️ Document uploaded but indexing failed: ${document.fileName}`);
          }

          return NextResponse.json({
            success: true,
            data: document,
            indexed,
            message: indexed 
              ? 'Document uploaded and indexed successfully' 
              : 'Document uploaded but indexing is still processing',
          });
        } catch (error: any) {
          logger.error('Error uploading document for section:', error);
          return NextResponse.json(
            { error: 'Failed to upload document' },
            { status: 500 }
          );
        }
      }

      case 'refresh_context': {
        // Refresh document context after uploading a new document
        if (!state) {
          return NextResponse.json(
            { error: 'State required' },
            { status: 400 }
          );
        }

        try {
          const generationState = state as SectionGenerationState;
          
          // Get previous sections
          const previousSections = await prisma.opinionSection.findMany({
            where: { opinionDraftId: draftId },
            orderBy: { order: 'asc' },
          });

          // Build Q&A history for search
          const qaHistory = generationState.questions
            .filter(q => q.answer)
            .map(q => `${q.question} ${q.answer}`)
            .join(' ');

          // Re-search documents with current context
          logger.info(`🔄 Refreshing document context for ${generationState.sectionType} section`);
          
          // Use the SectionGenerator's search method (we need to make it public or create a helper)
          // For now, let's do a direct search using ResearchAgent
          const { ResearchAgent } = await import('@/lib/agents/researchAgent');
          
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

          logger.info(`✅ Context refreshed: ${updatedState.documentFindings.length} total documents`);

          return NextResponse.json({
            success: true,
            state: updatedState,
            message: `Found ${uniqueNewFindings.length} new document references`,
          });
        } catch (error: any) {
          logger.error('Error refreshing context:', error);
          return NextResponse.json(
            { error: 'Failed to refresh context' },
            { status: 500 }
          );
        }
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Error in sections API:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]/opinion-drafts/[draftId]/sections
 * Update a section or reorder sections
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; draftId: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const draftId = parseInt(params.draftId);
    const body = await request.json();
    const { sectionId, title, content, reviewed, reorderData } = body;

    if (reorderData) {
      // Batch update order
      await Promise.all(
        reorderData.map((item: { id: number; order: number }) =>
          prisma.opinionSection.update({
            where: { id: item.id },
            data: { order: item.order },
          })
        )
      );

      return NextResponse.json({
        success: true,
        message: 'Sections reordered successfully',
      });
    }

    if (!sectionId) {
      return NextResponse.json(
        { error: 'Section ID required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (reviewed !== undefined) {
      updateData.reviewed = reviewed;
      if (reviewed) {
        updateData.reviewedBy = session.user.email;
        updateData.reviewedAt = new Date();
      }
    }

    const section = await prisma.opinionSection.update({
      where: { id: sectionId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: section,
      message: 'Section updated successfully',
    });
  } catch (error) {
    logger.error('Error updating section:', error);
    return NextResponse.json(
      { error: 'Failed to update section' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/opinion-drafts/[draftId]/sections
 * Delete a section
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; draftId: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get('sectionId');

    if (!sectionId) {
      return NextResponse.json(
        { error: 'Section ID required' },
        { status: 400 }
      );
    }

    await prisma.opinionSection.delete({
      where: { id: parseInt(sectionId) },
    });

    return NextResponse.json({
      success: true,
      message: 'Section deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting section:', error);
    return NextResponse.json(
      { error: 'Failed to delete section' },
      { status: 500 }
    );
  }
}
