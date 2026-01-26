/**
 * Opinion Draft Chat API Routes
 * GET /api/tasks/[id]/opinion-drafts/[draftId]/chat - Get chat history
 * POST /api/tasks/[id]/opinion-drafts/[draftId]/chat - Send message and get AI response
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { OpinionChatMessageSchema } from '@/lib/validation/schemas';
import { successResponse, parseTaskId, parseNumericId } from '@/lib/utils/apiUtils';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { logger } from '@/lib/utils/logger';
import { ResearchAgent } from '@/lib/tools/tax-opinion/agents/researchAgent';
import { ragEngine } from '@/lib/tools/tax-opinion/services/ragEngine';
import { generateText } from 'ai';
import { models, getModelParams } from '@/lib/ai/config';

/**
 * Helper: Verify draft belongs to the task (IDOR protection)
 */
async function verifyDraftBelongsToTask(
  draftId: number,
  taskId: number
): Promise<void> {
  const draft = await prisma.opinionDraft.findFirst({
    where: { id: draftId, taskId },
    select: { id: true },
  });

  if (!draft) {
    throw new AppError(
      404,
      'Opinion draft not found or does not belong to this task',
      ErrorCodes.NOT_FOUND,
      { draftId, taskId }
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

/**
 * GET /api/tasks/[id]/opinion-drafts/[draftId]/chat
 * Get chat history for an opinion draft
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_TASKS,
  taskIdParam: 'id',
  handler: async (request, { user, params }) => {
    const taskId = parseTaskId(params.id);
    const draftId = parseNumericId(params.draftId, 'draftId');

    // IDOR protection: verify draft belongs to this task
    await verifyDraftBelongsToTask(draftId, taskId);

    const messages = await prisma.opinionChatMessage.findMany({
      where: {
        opinionDraftId: draftId,
        sectionGenerationId: null, // Only get chat messages, not section generation Q&A
      },
      select: {
        id: true,
        opinionDraftId: true,
        role: true,
        content: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: [
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
      take: 100,
    });

    return NextResponse.json(successResponse(messages), {
      headers: { 'Cache-Control': 'no-store' },
    });
  },
});

/**
 * POST /api/tasks/[id]/opinion-drafts/[draftId]/chat
 * Send a message and get AI response (simple Q&A/discussion, no agent orchestration)
 */
export const POST = secureRoute.aiWithParams({
  feature: Feature.MANAGE_TASKS,
  taskIdParam: 'id',
  schema: OpinionChatMessageSchema,
  handler: async (request, { user, data, params }) => {
    const taskId = parseTaskId(params.id);
    const draftId = parseNumericId(params.draftId, 'draftId');
    const { message } = data;

    // IDOR protection: verify draft belongs to this task
    await verifyDraftBelongsToTask(draftId, taskId);

    // Get conversation history (exclude section generation messages)
    const history = await prisma.opinionChatMessage.findMany({
      where: {
        opinionDraftId: draftId,
        sectionGenerationId: null,
      },
      select: {
        role: true,
        content: true,
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
      select: {
        id: true,
        opinionDraftId: true,
        role: true,
        content: true,
        metadata: true,
        createdAt: true,
      },
    });

    // Determine if this is a document query or general discussion
    const isDocumentQuery = detectDocumentQuery(message);

    let responseText: string;
    let sources: Array<{ documentId: number; fileName: string; category: string }> = [];

    if (isDocumentQuery) {
      // Use RAG to search documents
      logger.info('Document query detected', {
        userId: user.id,
        draftId,
        preview: message.substring(0, 50),
      });

      try {
        const searchResult = await ResearchAgent.searchDocuments(draftId, message);

        if (searchResult.sources.length > 0) {
          responseText = searchResult.results;
          sources = searchResult.sources.map((s, idx) => ({
            documentId: idx,
            fileName: s.fileName,
            category: s.category,
          }));
          logger.info('Found source documents for query', {
            userId: user.id,
            draftId,
            sourcesCount: sources.length,
          });
        } else {
          // Check if any documents exist for this draft
          const documentCount = await prisma.opinionDocument.count({
            where: { opinionDraftId: draftId },
          });

          if (documentCount === 0) {
            responseText = `No documents have been uploaded yet. Please upload relevant documents in the Documents tab so I can help answer your questions about them.`;
          } else {
            // Documents exist but search returned no results
            const isRagReady = ragEngine?.isReady();

            if (!isRagReady) {
              responseText = `⚠️ **Document Search Unavailable**

Azure AI Search is not configured, so I cannot search the uploaded documents. The ${documentCount} document${documentCount > 1 ? 's have' : ' has'} been uploaded but not indexed for search.

**To enable document search:**
1. Configure Azure AI Search environment variables
2. Re-upload the documents for indexing

For now, you can:
- Ask me general questions about South African tax law
- Discuss your tax case and I'll provide guidance
- I can help structure your opinion even without searching documents`;
            } else {
              responseText = `I couldn't find specific information about that in the uploaded documents. Please ensure:

1. Documents are uploaded in the Documents tab
2. Documents show "Ready for AI search" status (vectorized: true)
3. Your question relates to content in the documents

**Current status:** ${documentCount} document${documentCount > 1 ? 's' : ''} uploaded for this opinion.

You can also ask me general questions about tax law or discuss your case.`;
            }
          }
        }
      } catch (error) {
        logger.error('Error searching documents', {
          error,
          userId: user.id,
          draftId,
        });
        responseText = `I encountered an error while searching the documents. You can still ask me general questions about tax law or discuss your case.`;
      }
    } else {
      // General discussion - use AI for case discussion and guidance
      logger.info('General discussion query', {
        userId: user.id,
        draftId,
        preview: message.substring(0, 50),
      });

      const conversationContext = history
        .slice(-10) // Last 10 messages
        .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
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
      select: {
        id: true,
        opinionDraftId: true,
        role: true,
        content: true,
        metadata: true,
        createdAt: true,
      },
    });

    logger.info('Processed chat message', {
      userId: user.id,
      taskId,
      draftId,
      isDocumentQuery,
      sourcesFound: sources.length,
    });

    return NextResponse.json(
      successResponse({
        userMessage,
        assistantMessage,
        sources,
      })
    );
  },
});
