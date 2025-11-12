import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { ResearchAgent } from '@/lib/agents/researchAgent';
import { generateText } from 'ai';
import { models, getModelParams } from '@/lib/ai/config';
import { logger } from '@/lib/utils/logger';

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
      where: { 
        opinionDraftId: draftId,
        sectionGenerationId: null, // Only get chat messages, not section generation Q&A
      },
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
 * Send a message and get AI response (simple Q&A/discussion, no agent orchestration)
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
    const { message } = body;

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

    // Get conversation history (exclude section generation messages)
    const history = await prisma.opinionChatMessage.findMany({
      where: { 
        opinionDraftId: draftId,
        sectionGenerationId: null,
      },
      orderBy: { createdAt: 'asc' },
      take: 20, // Limit context to recent messages
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

    // Determine if this is a document query or general discussion
    const isDocumentQuery = detectDocumentQuery(message);

    let responseText: string;
    let sources: Array<{ documentId: number; fileName: string; category: string }> = [];

    if (isDocumentQuery) {
      // Use RAG to search documents
      logger.info(`📄 Document query detected: "${message.substring(0, 50)}..."`);
      
      const searchResult = await ResearchAgent.searchDocuments(draftId, message);
      
      if (searchResult.sources.length > 0) {
        responseText = searchResult.results;
        sources = searchResult.sources.map((s, idx) => ({
          documentId: idx,
          fileName: s.fileName,
          category: s.category,
        }));
      } else {
        responseText = `I couldn't find specific information about that in the uploaded documents. Please ensure:

1. Documents are uploaded in the Documents tab
2. Documents show "Ready for AI search" status
3. Your question relates to content in the documents

You can also ask me general questions about tax law or discuss your case.`;
      }
    } else {
      // General discussion - use AI for case discussion and guidance
      logger.info(`💬 General discussion query: "${message.substring(0, 50)}..."`);
      
      const conversationContext = history
        .slice(-10) // Last 10 messages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

      const { text } = await generateText({
        model: models.mini,
        ...getModelParams({ temperature: 0.7 }),
        system: `You are an expert South African tax consultant helping draft a tax opinion. 
        
Your role is to:
- Answer questions about South African tax law
- Discuss tax positions and interpretations
- Provide guidance on structuring tax opinions
- Help think through tax issues and arguments
- Suggest relevant sections or precedents to consider

Be professional, technically accurate, and reference the Income Tax Act when relevant.
Do not make up case law or sections - acknowledge if you're uncertain.`,
        prompt: `Conversation so far:
${conversationContext}

User: ${message}

Provide a helpful, professional response:`,
      });

      responseText = text;
    }

    // Save assistant response
    const assistantMessage = await prisma.opinionChatMessage.create({
      data: {
        opinionDraftId: draftId,
        role: 'assistant',
        content: responseText,
        metadata: JSON.stringify({
          sources: sources || [],
          isDocumentQuery,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        userMessage,
        assistantMessage,
        sources,
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
 * Helper: Detect if message is a document query
 */
function detectDocumentQuery(message: string): boolean {
  const lower = message.toLowerCase();
  const documentKeywords = [
    'document',
    'assessment',
    'uploaded',
    'file',
    'pdf',
    'in the',
    'from the',
    'according to',
    'what does the',
    'what is in',
    'show me',
    'tell me about the',
    'explain the',
    'summarize',
    'find',
    'search',
    'look for',
  ];

  return documentKeywords.some(keyword => lower.includes(keyword));
}
