import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AgentOrchestrator, WorkflowPhase } from '@/lib/agents/agentOrchestrator';
import { logger } from '@/lib/logger';

/**
 * GET /api/projects/[id]/opinion-drafts/[draftId]/chat
 * Get chat history for an opinion draft
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

    const messages = await prisma.opinionChatMessage.findMany({
      where: { opinionDraftId: draftId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, data: messages });
  } catch (error) {
    logger.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat messages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/opinion-drafts/[draftId]/chat
 * Send a message and get AI response
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
    const { message, phase } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

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

    // Get conversation history
    const history = await prisma.opinionChatMessage.findMany({
      where: { opinionDraftId: draftId },
      orderBy: { createdAt: 'asc' },
    });

    // Save user message
    const userMessage = await prisma.opinionChatMessage.create({
      data: {
        opinionDraftId: draftId,
        role: 'user',
        content: message,
        metadata: JSON.stringify({ timestamp: new Date().toISOString() }),
      },
    });

    // Process message with agent orchestrator
    const response = await AgentOrchestrator.handleMessage(
      message,
      [...history, userMessage],
      draftId,
      phase as WorkflowPhase | undefined
    );

    // Save assistant response
    const assistantMessage = await prisma.opinionChatMessage.create({
      data: {
        opinionDraftId: draftId,
        role: 'assistant',
        content: response.message,
        metadata: JSON.stringify({
          phase: response.phase,
          workflowState: response.workflowState,
          sources: response.sources || [],
          suggestions: response.suggestions || [],
          timestamp: new Date().toISOString(),
        }),
      },
    });

    // Handle specific actions based on metadata
    if (response.metadata?.action === 'start_drafting') {
      // Trigger drafting process
      await handleDraftingAction(draftId, history);
    } else if (response.metadata?.action === 'start_review') {
      // Trigger review process
      await handleReviewAction(draftId);
    }

    return NextResponse.json({
      success: true,
      data: {
        userMessage,
        assistantMessage,
        phase: response.phase,
        suggestions: response.suggestions,
        sources: response.sources,
        workflowState: response.workflowState,
      },
    });
  } catch (error) {
    logger.error('Error processing chat message:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}

/**
 * Handle drafting action
 */
async function handleDraftingAction(
  draftId: number,
  history: any[]
): Promise<void> {
  try {
    // This would trigger the drafting workflow
    // For now, just log the action
    logger.info(`Drafting action triggered for draft ${draftId}`);
    
    // In a complete implementation, this would:
    // 1. Extract facts, research, and analysis from history
    // 2. Call DraftingAgent to generate sections
    // 3. Save sections to database
    // This can be implemented as a separate endpoint or background job
  } catch (error) {
    logger.error('Error handling drafting action:', error);
  }
}

/**
 * Handle review action
 */
async function handleReviewAction(draftId: number): Promise<void> {
  try {
    logger.info(`Review action triggered for draft ${draftId}`);
    
    // In a complete implementation, this would:
    // 1. Fetch all sections
    // 2. Call ReviewAgent to review
    // 3. Save review feedback
  } catch (error) {
    logger.error('Error handling review action:', error);
  }
}

/**
 * DELETE /api/projects/[id]/opinion-drafts/[draftId]/chat
 * Clear chat history (optional feature)
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

    const draftId = parseInt(params.draftId);

    await prisma.opinionChatMessage.deleteMany({
      where: { opinionDraftId: draftId },
    });

    return NextResponse.json({
      success: true,
      message: 'Chat history cleared',
    });
  } catch (error) {
    logger.error('Error clearing chat history:', error);
    return NextResponse.json(
      { error: 'Failed to clear chat history' },
      { status: 500 }
    );
  }
}

