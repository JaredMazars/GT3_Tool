import { InterviewAgent } from './interviewAgent';
import { ResearchAgent, ResearchFindings } from './researchAgent';
import { AnalysisAgent, TaxAnalysis } from './analysisAgent';
import { DraftingAgent } from './draftingAgent';
import { ReviewAgent, ReviewFeedback } from './reviewAgent';
import { OpinionChatMessage } from '@/types';
import { logger } from '@/lib/utils/logger';

export type WorkflowPhase =
  | 'interview'
  | 'research'
  | 'analysis'
  | 'drafting'
  | 'review'
  | 'complete';

export interface WorkflowState {
  phase: WorkflowPhase;
  completeness: number;
  factsEstablished: boolean;
  researchComplete: boolean;
  analysisComplete: boolean;
  draftComplete: boolean;
  reviewComplete: boolean;
  readyForExport: boolean;
}

export interface ChatResponse {
  message: string;
  phase: WorkflowPhase;
  suggestions?: string[];
  sources?: Array<{
    documentId: number;
    fileName: string;
    category: string;
  }>;
  workflowState: WorkflowState;
  metadata?: Record<string, any>;
}

export class AgentOrchestrator {
  /**
   * Determine current workflow phase based on conversation
   */
  static async determinePhase(
    conversationHistory: OpinionChatMessage[]
  ): Promise<WorkflowPhase> {
    if (conversationHistory.length === 0) {
      return 'interview';
    }

    // Check if facts are established
    const completeness = await InterviewAgent.assessCompleteness(
      conversationHistory
    );

    if (!completeness.readyToProceed) {
      return 'interview';
    }

    // Check if research has been conducted
    const lastMessages = conversationHistory.slice(-5);
    const hasResearch = lastMessages.some((msg) =>
      msg.metadata?.includes('research')
    );

    if (!hasResearch) {
      return 'research';
    }

    // Check if analysis is done
    const hasAnalysis = lastMessages.some((msg) =>
      msg.metadata?.includes('analysis')
    );

    if (!hasAnalysis) {
      return 'analysis';
    }

    // Check if draft exists
    const hasDraft = lastMessages.some((msg) => msg.metadata?.includes('draft'));

    if (!hasDraft) {
      return 'drafting';
    }

    // If all phases complete, in review
    return 'review';
  }

  /**
   * Handle user message and coordinate appropriate agent response
   */
  static async handleMessage(
    userMessage: string,
    conversationHistory: OpinionChatMessage[],
    draftId: number,
    currentPhase?: WorkflowPhase
  ): Promise<ChatResponse> {
    try {
      // Determine phase if not provided
      const phase = currentPhase || (await this.determinePhase(conversationHistory));

      logger.info(`🤖 Processing message in phase: ${phase}, draftId: ${draftId}`);
      logger.info(`📝 User message: "${userMessage.substring(0, 100)}..."`);

      // Route to appropriate agent based on phase and message content
      // Check if user is asking about documents or uploaded content
      if (this.isDocumentQuery(userMessage)) {
        logger.info(`📄 Detected document query - triggering document search`);
        return await this.handleResearchRequest(
          userMessage,
          conversationHistory,
          draftId
        );
      }

      if (this.isExplicitRequest(userMessage, 'research')) {
        logger.info(`🔍 Explicit research request detected`);
        return await this.handleResearchRequest(
          userMessage,
          conversationHistory,
          draftId
        );
      }

      if (this.isExplicitRequest(userMessage, 'draft')) {
        return await this.handleDraftRequest(
          userMessage,
          conversationHistory
        );
      }

      if (this.isExplicitRequest(userMessage, 'review')) {
        return await this.handleReviewRequest(userMessage, conversationHistory);
      }

      // Default routing by phase
      switch (phase) {
        case 'interview':
          return await this.handleInterviewPhase(userMessage, conversationHistory);

        case 'research':
          return await this.handleResearchPhase(
            userMessage,
            conversationHistory,
            draftId
          );

        case 'analysis':
          return await this.handleAnalysisPhase(
            userMessage,
            conversationHistory,
            draftId
          );

        case 'drafting':
          return await this.handleDraftingPhase(userMessage, conversationHistory);

        case 'review':
          return await this.handleReviewPhase(userMessage, conversationHistory);

        default:
          return await this.handleGeneralQuery(userMessage, conversationHistory);
      }
    } catch (error) {
      logger.error('Error in agent orchestration:', error);
      throw new Error('Failed to process message');
    }
  }

  /**
   * Handle interview phase
   */
  private static async handleInterviewPhase(
    userMessage: string,
    conversationHistory: OpinionChatMessage[]
  ): Promise<ChatResponse> {
    // Generate next question
    const question = await InterviewAgent.generateQuestion(conversationHistory);

    // Assess completeness
    const completeness = await InterviewAgent.assessCompleteness([
      ...conversationHistory,
      {
        id: 0,
        opinionDraftId: 0,
        role: 'user',
        content: userMessage,
        createdAt: new Date(),
      },
    ]);

    const workflowState: WorkflowState = {
      phase: completeness.readyToProceed ? 'research' : 'interview',
      completeness: completeness.completeness,
      factsEstablished: completeness.readyToProceed,
      researchComplete: false,
      analysisComplete: false,
      draftComplete: false,
      reviewComplete: false,
      readyForExport: false,
    };

    let message = question;
    const suggestions: string[] = [];

    if (completeness.readyToProceed) {
      message = `Thank you for providing that information. I now have enough details to proceed.\n\n${question}\n\nWould you like me to:\n1. Search the uploaded documents for relevant information\n2. Continue gathering more details\n3. Proceed to analyze the tax position`;
      suggestions.push(
        'Search uploaded documents',
        'Continue interview',
        'Proceed to analysis'
      );
    }

    return {
      message,
      phase: workflowState.phase,
      suggestions,
      workflowState,
      metadata: { completeness: completeness.completeness },
    };
  }

  /**
   * Handle research phase
   */
  private static async handleResearchPhase(
    userMessage: string,
    conversationHistory: OpinionChatMessage[],
    draftId: number
  ): Promise<ChatResponse> {
    // Summarize facts from conversation
    const facts = await InterviewAgent.summarizeFacts(conversationHistory);

    // Extract tax issue
    const taxIssue = await this.extractTaxIssue(conversationHistory);

    // Conduct research
    const research = await ResearchAgent.conductResearch(draftId, taxIssue, facts);

    const message = `I've conducted research on your tax issue. Here's what I found:

**Relevant Law Sections:**
${research.relevantLaw.map((law) => `- ${law}`).join('\n')}

**Document Findings:**
${research.documentFindings}

**Precedents:**
${research.precedents.map((p) => `- ${p}`).join('\n')}

${research.additionalResearchNeeded.length > 0 ? `\n**Additional Research Needed:**\n${research.additionalResearchNeeded.map((item) => `- ${item}`).join('\n')}` : ''}

Would you like me to:
1. Analyze the tax position based on this research
2. Search for more specific information in the documents
3. Explore alternative positions`;

    const workflowState: WorkflowState = {
      phase: 'analysis',
      completeness: 75,
      factsEstablished: true,
      researchComplete: true,
      analysisComplete: false,
      draftComplete: false,
      reviewComplete: false,
      readyForExport: false,
    };

    return {
      message,
      phase: 'analysis',
      suggestions: [
        'Analyze tax position',
        'Search for more details',
        'Explore alternatives',
      ],
      sources: research.citations.map((c) => ({
        documentId: c.documentId,
        fileName: c.fileName,
        category: c.category,
      })),
      workflowState,
      metadata: { research },
    };
  }

  /**
   * Handle analysis phase
   */
  private static async handleAnalysisPhase(
    userMessage: string,
    conversationHistory: OpinionChatMessage[],
    draftId: number
  ): Promise<ChatResponse> {
    const facts = await InterviewAgent.summarizeFacts(conversationHistory);
    const taxIssue = await this.extractTaxIssue(conversationHistory);
    const research = await ResearchAgent.conductResearch(draftId, taxIssue, facts);

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

    const message = `I've completed my analysis of the tax position:

**Main Issues:**
${analysis.mainIssues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

**Analysis:**
${analysis.legalAnalysis}

**Alternative Positions:**
${analysis.alternativePositions.map((pos, i) => `\n${i + 1}. ${pos.position} (${pos.likelihood} likelihood)\n   Strengths: ${pos.strengths.join(', ')}\n   Weaknesses: ${pos.weaknesses.join(', ')}`).join('\n')}

**Risks:**
${analysis.risks.map((risk, i) => `${i + 1}. [${risk.severity.toUpperCase()}] ${risk.risk}\n   Mitigation: ${risk.mitigation}`).join('\n\n')}

**Conclusion:**
${analysis.conclusion}

Would you like me to:
1. Draft the formal tax opinion
2. Explore a specific issue in more detail
3. Evaluate alternative positions`;

    const workflowState: WorkflowState = {
      phase: 'drafting',
      completeness: 85,
      factsEstablished: true,
      researchComplete: true,
      analysisComplete: true,
      draftComplete: false,
      reviewComplete: false,
      readyForExport: false,
    };

    return {
      message,
      phase: 'drafting',
      suggestions: ['Draft opinion', 'Explore specific issue', 'Evaluate alternatives'],
      workflowState,
      metadata: { analysis },
    };
  }

  /**
   * Handle drafting phase
   */
  private static async handleDraftingPhase(
    userMessage: string,
    conversationHistory: OpinionChatMessage[]
  ): Promise<ChatResponse> {
    const message = `I'm ready to draft the formal tax opinion. This will create structured sections:

1. **Facts** - Organized presentation of relevant facts
2. **Issue** - Clear statement of the tax question
3. **Law** - Applicable statutory provisions and case law
4. **Application** - Analysis applying law to facts
5. **Conclusion** - Final position with qualifications

Would you like me to:
1. Draft all sections now
2. Draft one section at a time for your review
3. Customize the structure`;

    const workflowState: WorkflowState = {
      phase: 'drafting',
      completeness: 90,
      factsEstablished: true,
      researchComplete: true,
      analysisComplete: true,
      draftComplete: false,
      reviewComplete: false,
      readyForExport: false,
    };

    return {
      message,
      phase: 'drafting',
      suggestions: ['Draft all sections', 'Draft section by section', 'Customize structure'],
      workflowState,
    };
  }

  /**
   * Handle review phase
   */
  private static async handleReviewPhase(
    userMessage: string,
    conversationHistory: OpinionChatMessage[]
  ): Promise<ChatResponse> {
    const message = `The opinion draft is complete and ready for review. I can:

1. **Perform Quality Review** - Comprehensive check of completeness, coherence, and logic
2. **Check Citations** - Verify all legal citations are proper
3. **Suggest Improvements** - Identify areas for enhancement
4. **Final Quality Check** - Confirm readiness for export

What would you like me to do?`;

    const workflowState: WorkflowState = {
      phase: 'review',
      completeness: 95,
      factsEstablished: true,
      researchComplete: true,
      analysisComplete: true,
      draftComplete: true,
      reviewComplete: false,
      readyForExport: false,
    };

    return {
      message,
      phase: 'review',
      suggestions: [
        'Quality review',
        'Check citations',
        'Suggest improvements',
        'Final check',
      ],
      workflowState,
    };
  }

  /**
   * Handle explicit research request
   */
  private static async handleResearchRequest(
    userMessage: string,
    conversationHistory: OpinionChatMessage[],
    draftId: number
  ): Promise<ChatResponse> {
    const query = this.extractSearchQuery(userMessage);
    logger.info(`🔎 Executing document search for draftId: ${draftId}`);
    logger.info(`🔎 Search query: "${query}"`);
    
    const result = await ResearchAgent.searchDocuments(draftId, query);
    
    logger.info(`📊 Search returned ${result.sources.length} sources`);
    if (result.sources.length > 0) {
      logger.info(`📄 Found documents: ${result.sources.map(s => s.fileName).join(', ')}`);
    } else {
      logger.warn(`⚠️ No documents found for draftId ${draftId}. Check if documents are uploaded and indexed.`);
    }

    const message = result.sources.length > 0
      ? `**Search Results:**\n\n${result.results}\n\n**Sources:**\n${result.sources.map((s) => `- ${s.fileName} (${s.category}): ${s.excerpt}`).join('\n')}`
      : `I couldn't find any relevant information in the uploaded documents. Please ensure:\n\n1. Documents are uploaded in the Documents tab\n2. Documents show "Ready for AI search" status\n3. You're asking about content that exists in the documents\n\nCurrent draft ID: ${draftId}`;

    const phase = await this.determinePhase(conversationHistory);
    const workflowState = await this.getWorkflowState(conversationHistory, phase);

    return {
      message,
      phase,
      sources: result.sources.map((s, idx) => ({
        documentId: idx,
        fileName: s.fileName,
        category: s.category,
      })),
      workflowState,
    };
  }

  /**
   * Handle explicit draft request
   */
  private static async handleDraftRequest(
    userMessage: string,
    conversationHistory: OpinionChatMessage[]
  ): Promise<ChatResponse> {
    const message = `I'll begin drafting the opinion sections. This will be available in the "Sections" tab where you can review and edit each section individually.`;

    const workflowState: WorkflowState = {
      phase: 'drafting',
      completeness: 90,
      factsEstablished: true,
      researchComplete: true,
      analysisComplete: true,
      draftComplete: false,
      reviewComplete: false,
      readyForExport: false,
    };

    return {
      message,
      phase: 'drafting',
      workflowState,
      metadata: { action: 'start_drafting' },
    };
  }

  /**
   * Handle explicit review request
   */
  private static async handleReviewRequest(
    userMessage: string,
    conversationHistory: OpinionChatMessage[]
  ): Promise<ChatResponse> {
    const message = `I'll review the opinion draft for quality and completeness. The review results will help identify any areas that need improvement before finalizing.`;

    const workflowState: WorkflowState = {
      phase: 'review',
      completeness: 95,
      factsEstablished: true,
      researchComplete: true,
      analysisComplete: true,
      draftComplete: true,
      reviewComplete: false,
      readyForExport: false,
    };

    return {
      message,
      phase: 'review',
      workflowState,
      metadata: { action: 'start_review' },
    };
  }

  /**
   * Handle general query
   */
  private static async handleGeneralQuery(
    userMessage: string,
    conversationHistory: OpinionChatMessage[]
  ): Promise<ChatResponse> {
    const phase = await this.determinePhase(conversationHistory);
    const workflowState = await this.getWorkflowState(conversationHistory, phase);

    return {
      message: `I'm here to help you develop a comprehensive tax opinion. We're currently in the ${phase} phase. How can I assist you?`,
      phase,
      suggestions: [
        'Continue with current phase',
        'Ask a specific question',
        'Get workflow status',
      ],
      workflowState,
    };
  }

  /**
   * Helper: Check if message contains explicit request
   */
  private static isExplicitRequest(message: string, type: string): boolean {
    const lower = message.toLowerCase();
    const keywords: Record<string, string[]> = {
      research: ['research', 'search', 'find', 'look for', 'document'],
      draft: ['draft', 'write', 'generate', 'create opinion'],
      review: ['review', 'check', 'evaluate', 'assess quality'],
    };

    return keywords[type]?.some((keyword) => lower.includes(keyword)) || false;
  }

  /**
   * Check if user is asking about uploaded documents
   */
  private static isDocumentQuery(message: string): boolean {
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
    ];

    return documentKeywords.some((keyword) => lower.includes(keyword));
  }

  /**
   * Helper: Extract search query from message
   */
  private static extractSearchQuery(message: string): string {
    // Limit input length to prevent ReDoS
    const safeMessage = message.substring(0, 1000);
    
    // Simple extraction with length limits to prevent catastrophic backtracking
    const patterns = [
      /search for (.{1,500})/i,
      /find (.{1,500})/i,
      /look for (.{1,500})/i,
      /information about (.{1,500})/i,
    ];

    for (const pattern of patterns) {
      const match = safeMessage.match(pattern);
      if (match && match[1]) return match[1];
    }

    return safeMessage;
  }

  /**
   * Helper: Extract tax issue from conversation
   */
  private static async extractTaxIssue(
    conversationHistory: OpinionChatMessage[]
  ): Promise<string> {
    const historyText = conversationHistory
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n')
      .substring(0, 4000);

    return `Tax issue based on conversation: ${historyText}`;
  }

  /**
   * Helper: Get workflow state
   */
  private static async getWorkflowState(
    conversationHistory: OpinionChatMessage[],
    phase: WorkflowPhase
  ): Promise<WorkflowState> {
    const completeness = conversationHistory.length > 0
      ? await InterviewAgent.assessCompleteness(conversationHistory)
      : { completeness: 0, readyToProceed: false };

    return {
      phase,
      completeness: completeness.completeness,
      factsEstablished: completeness.readyToProceed,
      researchComplete: ['analysis', 'drafting', 'review', 'complete'].includes(phase),
      analysisComplete: ['drafting', 'review', 'complete'].includes(phase),
      draftComplete: ['review', 'complete'].includes(phase),
      reviewComplete: phase === 'complete',
      readyForExport: phase === 'complete',
    };
  }
}


