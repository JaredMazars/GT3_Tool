import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DraftingAgent } from '@/lib/agents/draftingAgent';
import { InterviewAgent } from '@/lib/agents/interviewAgent';
import { ResearchAgent } from '@/lib/agents/researchAgent';
import { AnalysisAgent } from '@/lib/agents/analysisAgent';
import { logger } from '@/lib/logger';

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
 * Create a new section or generate all sections with AI
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
    const { action, sectionType, title, content, order } = body;

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
    if (action === 'generate_all') {
      // Generate all sections with AI
      const sections = await generateAllSections(draftId, projectId);
      return NextResponse.json({
        success: true,
        data: sections,
        message: 'All sections generated successfully',
      });
    } else if (action === 'generate_section') {
      // Generate a specific section with AI
      if (!sectionType) {
        return NextResponse.json(
          { error: 'Section type required for generation' },
          { status: 400 }
        );
      }
      const section = await generateSection(draftId, projectId, sectionType);
      return NextResponse.json({
        success: true,
        data: section,
        message: `${sectionType} section generated successfully`,
      });
    } else {
      // Create manual section
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
  } catch (error) {
    logger.error('Error creating section:', error);
    return NextResponse.json(
      { error: 'Failed to create section' },
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

/**
 * Helper: Generate all sections with AI
 */
async function generateAllSections(
  draftId: number,
  projectId: number
): Promise<any[]> {
  try {
    // Get conversation history
    const history = await prisma.opinionChatMessage.findMany({
      where: { opinionDraftId: draftId },
      orderBy: { createdAt: 'asc' },
    });

    // Extract facts
    const facts = await InterviewAgent.summarizeFacts(history);

    // Extract tax issue
    const taxIssue = extractTaxIssueFromHistory(history);

    // Conduct research
    const research = await ResearchAgent.conductResearch(draftId, taxIssue, facts);

    // Perform analysis
    const researchText = `
Law: ${research.relevantLaw.join('; ')}
Documents: ${research.documentFindings}
Precedents: ${research.precedents.join('; ')}
    `.trim();

    const analysis = await AnalysisAgent.analyzeTaxPosition(
      facts,
      researchText,
      taxIssue
    );

    // Generate all sections
    const sectionContents = await DraftingAgent.draftCompleteOpinion(
      facts,
      taxIssue,
      research.relevantLaw,
      research.precedents,
      analysis.legalAnalysis,
      JSON.stringify(analysis.risks)
    );

    // Save sections to database
    const sections = await Promise.all(
      sectionContents.map((section) =>
        prisma.opinionSection.create({
          data: {
            opinionDraftId: draftId,
            sectionType: section.sectionType,
            title: section.title,
            content: section.content,
            order: section.order,
            aiGenerated: true,
            reviewed: false,
          },
        })
      )
    );

    return sections;
  } catch (error) {
    logger.error('Error generating all sections:', error);
    throw error;
  }
}

/**
 * Helper: Generate a specific section with AI
 */
async function generateSection(
  draftId: number,
  projectId: number,
  sectionType: string
): Promise<any> {
  try {
    // Get conversation history
    const history = await prisma.opinionChatMessage.findMany({
      where: { opinionDraftId: draftId },
      orderBy: { createdAt: 'asc' },
    });

    const facts = await InterviewAgent.summarizeFacts(history);
    const taxIssue = extractTaxIssueFromHistory(history);

    let sectionContent;
    let order = 1;

    // Get current max order
    const maxOrder = await prisma.opinionSection.findFirst({
      where: { opinionDraftId: draftId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    order = maxOrder ? maxOrder.order + 1 : 1;

    switch (sectionType.toLowerCase()) {
      case 'facts':
        sectionContent = await DraftingAgent.draftFactsSection(facts);
        order = 1;
        break;

      case 'issue':
        sectionContent = await DraftingAgent.draftIssueSection(taxIssue, facts);
        order = 2;
        break;

      case 'law':
        const research = await ResearchAgent.conductResearch(draftId, taxIssue, facts);
        sectionContent = await DraftingAgent.draftLawSection(
          research.relevantLaw,
          research.precedents
        );
        order = 3;
        break;

      case 'application':
        const researchData = await ResearchAgent.conductResearch(draftId, taxIssue, facts);
        const lawSection = await DraftingAgent.draftLawSection(
          researchData.relevantLaw,
          researchData.precedents
        );
        const analysisData = await AnalysisAgent.analyzeTaxPosition(
          facts,
          JSON.stringify(researchData),
          taxIssue
        );
        sectionContent = await DraftingAgent.draftApplicationSection(
          facts,
          lawSection.content,
          analysisData.legalAnalysis
        );
        order = 4;
        break;

      case 'conclusion':
        const analysisForConclusion = await AnalysisAgent.analyzeTaxPosition(
          facts,
          'Based on conversation',
          taxIssue
        );
        sectionContent = await DraftingAgent.draftConclusionSection(
          taxIssue,
          analysisForConclusion.legalAnalysis,
          JSON.stringify(analysisForConclusion.risks)
        );
        order = 5;
        break;

      default:
        throw new Error(`Unknown section type: ${sectionType}`);
    }

    // Create section
    const section = await prisma.opinionSection.create({
      data: {
        opinionDraftId: draftId,
        sectionType,
        title: sectionContent.title,
        content: sectionContent.content,
        order,
        aiGenerated: true,
        reviewed: false,
      },
    });

    return section;
  } catch (error) {
    logger.error(`Error generating ${sectionType} section:`, error);
    throw error;
  }
}

/**
 * Helper: Extract tax issue from conversation history
 */
function extractTaxIssueFromHistory(history: any[]): string {
  // Simple extraction - in production, use AI to extract
  const historyText = history
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join('\n')
    .substring(0, 2000);

  return `Tax issue from conversation: ${historyText}`;
}

