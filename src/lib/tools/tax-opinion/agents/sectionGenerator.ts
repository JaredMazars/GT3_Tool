import { OpinionSection, OpinionChatMessage } from '@/types';
import { InterviewAgent } from './interviewAgent';
import { ResearchAgent } from './researchAgent';
import { AnalysisAgent } from './analysisAgent';
import { DraftingAgent } from './draftingAgent';
import { logger } from '@/lib/utils/logger';
import { prisma } from '@/lib/db/prisma';

export interface DocumentFinding {
  content: string;
  fileName: string;
  category: string;
  score: number;
}

export interface SectionGenerationState {
  sectionType: string;
  customTitle?: string;
  questions: Array<{ question: string; answer?: string }>;
  currentQuestionIndex: number;
  isComplete: boolean;
  generationId: string;
  documentFindings: DocumentFinding[];
}

export class SectionGenerator {
  /**
   * Helper: Build search query based on section type
   */
  private static buildSearchQuery(
    sectionType: string,
    previousSections: OpinionSection[],
    qaHistory: string
  ): string {
    const type = sectionType.toLowerCase();

    switch (type) {
      case 'facts':
        return `factual circumstances background taxpayer details ${qaHistory}`;
      case 'issue':
        return `tax issue question dispute assessment ${qaHistory}`;
      case 'law':
        return `legislation sections regulations case law precedent ${qaHistory}`;
      case 'conclusion':
        return `conclusion position recommendation ${qaHistory}`;
      case 'analysis':
      case 'application': {
        const facts = previousSections.find(s => s.sectionType.toLowerCase() === 'facts')?.content || '';
        const issue = previousSections.find(s => s.sectionType.toLowerCase() === 'issue')?.content || '';
        return `${issue} ${facts} ${qaHistory}`;
      }
      default:
        return `${sectionType} ${qaHistory}`;
    }
  }

  /**
   * Helper: Convert research sources to document findings
   */
  private static convertToFindings(sources: any[]): DocumentFinding[] {
    return sources.map(source => ({
      content: source.excerpt || '',
      fileName: source.fileName,
      category: source.category,
      score: 0.8,
    }));
  }

  /**
   * Search documents for relevant context based on section type and Q&A history
   * Refactored to reduce cognitive complexity
   */
  private static async searchDocumentsForContext(
    draftId: number,
    sectionType: string,
    previousSections: OpinionSection[],
    qaHistory: string = ''
  ): Promise<DocumentFinding[]> {
    try {
      const searchQuery = this.buildSearchQuery(sectionType, previousSections, qaHistory);

      logger.info(`🔍 Searching documents for ${sectionType} section: "${searchQuery.substring(0, 100)}..."`);

      const searchResult = await ResearchAgent.searchDocuments(draftId, searchQuery);
      const findings = this.convertToFindings(searchResult.sources);

      logger.info(`✅ Found ${findings.length} relevant document excerpts for ${sectionType}`);
      
      return findings;
    } catch (error) {
      logger.error('Error searching documents for context:', error);
      return [];
    }
  }

  /**
   * Start a new section generation flow
   * Returns the first question and initial state
   */
  static async startSection(
    sectionType: string,
    draftId: number,
    customTitle?: string
  ): Promise<{ question: string; state: SectionGenerationState }> {
    logger.info(`Starting section generation: ${sectionType} for draft ${draftId}`);

    // Generate unique ID for this section generation flow (cryptographically secure)
    const generationId = `section_${Date.now()}_${crypto.randomUUID()}`;

    // Get chat history for context
    const chatHistory = await prisma.opinionChatMessage.findMany({
      where: { 
        opinionDraftId: draftId,
        sectionGenerationId: null, // Only get chat messages, not section generation messages
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get existing sections for context
    const existingSections = await prisma.opinionSection.findMany({
      where: { opinionDraftId: draftId },
      orderBy: { order: 'asc' },
    });

    // Search documents for initial context
    const documentFindings = await this.searchDocumentsForContext(
      draftId,
      sectionType,
      existingSections,
      ''
    );

    // Generate first question based on section type (context-aware)
    const question = await this.generateInitialQuestion(
      sectionType,
      chatHistory,
      existingSections,
      customTitle,
      documentFindings
    );

    const state: SectionGenerationState = {
      sectionType,
      customTitle,
      questions: [{ question, answer: undefined }],
      currentQuestionIndex: 0,
      isComplete: false,
      generationId,
      documentFindings,
    };

    // Save the question as a chat message
    await prisma.opinionChatMessage.create({
      data: {
        opinionDraftId: draftId,
        role: 'assistant',
        content: question,
        sectionGenerationId: generationId,
        sectionType,
      },
    });

    return { question, state };
  }

  /**
   * Process user's answer and determine next step
   * Returns next question or indicates completion
   */
  static async answerQuestion(
    state: SectionGenerationState,
    answer: string,
    draftId: number
  ): Promise<{ question?: string; complete: boolean; state: SectionGenerationState }> {
    logger.info(`Processing answer for section ${state.sectionType}, question ${state.currentQuestionIndex}`);

    // Save the user's answer
    await prisma.opinionChatMessage.create({
      data: {
        opinionDraftId: draftId,
        role: 'user',
        content: answer,
        sectionGenerationId: state.generationId,
        sectionType: state.sectionType,
      },
    });

    // Update state with the answer
    const currentQuestion = state.questions[state.currentQuestionIndex];
    if (currentQuestion) {
      currentQuestion.answer = answer;
    }
    state.currentQuestionIndex += 1;

    // Search documents with updated context (after each answer)
    const previousSections = await prisma.opinionSection.findMany({
      where: { opinionDraftId: draftId },
      orderBy: { order: 'asc' },
    });
    
    const qaHistory = state.questions
      .filter(q => q.answer)
      .map(q => `${q.question} ${q.answer}`)
      .join(' ');
    
    const newFindings = await this.searchDocumentsForContext(
      draftId,
      state.sectionType,
      previousSections,
      qaHistory
    );
    
    // Merge new findings with existing (avoid duplicates by fileName)
    const existingFileNames = new Set(state.documentFindings.map(d => d.fileName));
    const uniqueNewFindings = newFindings.filter(d => !existingFileNames.has(d.fileName));
    state.documentFindings = [...state.documentFindings, ...uniqueNewFindings];

    // Determine if more questions are needed
    const needsMoreQuestions = await this.assessCompleteness(state, draftId);

    if (needsMoreQuestions) {
      // Generate next question
      const nextQuestion = await this.generateFollowUpQuestion(state, draftId);
      state.questions.push({ question: nextQuestion, answer: undefined });

      // Save the question
      await prisma.opinionChatMessage.create({
        data: {
          opinionDraftId: draftId,
          role: 'assistant',
          content: nextQuestion,
          sectionGenerationId: state.generationId,
          sectionType: state.sectionType,
        },
      });

      return { question: nextQuestion, complete: false, state };
    }

    // Mark as complete
    state.isComplete = true;
    return { complete: true, state };
  }

  /**
   * Generate the final section content using appropriate agent
   */
  static async generateContent(
    state: SectionGenerationState,
    draftId: number,
    previousSections: OpinionSection[]
  ): Promise<string> {
    logger.info(`Generating content for ${state.sectionType} section`);

    if (!state.isComplete) {
      throw new Error('Cannot generate content - questions not complete');
    }

    // Get all chat history and section generation Q&A
    const chatHistory = await prisma.opinionChatMessage.findMany({
      where: { 
        opinionDraftId: draftId,
        sectionGenerationId: null,
      },
      orderBy: { createdAt: 'asc' },
    });

    const sectionQA = await prisma.opinionChatMessage.findMany({
      where: { 
        opinionDraftId: draftId,
        sectionGenerationId: state.generationId,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Build full context including documents
    const fullContext = this.buildFullContext(state, previousSections);
    logger.info(`📚 Full context for section generation (${fullContext.length} chars, ${state.documentFindings.length} documents)`);

    // Route to appropriate agent based on section type
    switch (state.sectionType.toLowerCase()) {
      case 'facts':
        return await this.generateFactsSection(state, sectionQA, previousSections, draftId, fullContext);
      
      case 'issue':
        return await this.generateIssueSection(state, sectionQA, chatHistory, previousSections, fullContext);
      
      case 'law':
        return await this.generateLawSection(state, sectionQA, previousSections, draftId, fullContext);
      
      case 'analysis':
      case 'application':
        return await this.generateAnalysisSection(state, sectionQA, previousSections, draftId, fullContext);
      
      case 'conclusion':
        return await this.generateConclusionSection(state, sectionQA, previousSections, draftId, fullContext);
      
      case 'custom':
      default:
        return await this.generateCustomSection(state, sectionQA, previousSections, draftId, fullContext);
    }
  }

  /**
   * Generate initial question based on section type
   */
  private static async generateInitialQuestion(
    sectionType: string,
    chatHistory: OpinionChatMessage[],
    existingSections: OpinionSection[],
    customTitle: string | undefined,
    documentFindings: DocumentFinding[]
  ): Promise<string> {
    const contextSummary = this.buildContextSummary(chatHistory, existingSections);
    
    // Build document context string
    let docContext = '';
    if (documentFindings.length > 0) {
      const docNames = [...new Set(documentFindings.map(d => d.fileName))];
      docContext = ` I found ${docNames.length} relevant document${docNames.length > 1 ? 's' : ''} (${docNames.slice(0, 3).join(', ')}${docNames.length > 3 ? '...' : ''}).`;
    } else {
      docContext = ' To assist you better, consider uploading relevant documents such as assessments, correspondence, or financial statements.';
    }

    const prompts: Record<string, string> = {
      facts: `I'll help you document the relevant facts for this tax opinion.${docContext} Based on our conversation${contextSummary}, what are the key factual circumstances that give rise to this tax matter?`,
      
      issue: `I'll help you articulate the tax issue.${docContext} ${contextSummary ? `Considering ${contextSummary}, ` : ''}What specific tax question or questions need to be addressed in this opinion?`,
      
      law: `I'll help you identify the relevant legal framework.${docContext} What specific sections of the Income Tax Act, regulations, or case law are most relevant to this matter?`,
      
      analysis: `I'll help you analyze how the law applies to the facts.${docContext} What is your preliminary view on how the relevant tax provisions apply to this situation?`,
      
      application: `I'll help you apply the law to the facts.${docContext} What is your preliminary view on how the relevant tax provisions apply to this situation?`,
      
      conclusion: `I'll help you formulate the conclusion.${docContext} Based on the analysis, what is your conclusion on the tax treatment or position?`,
      
      custom: `I'll help you create the "${customTitle}" section.${docContext} What information or analysis should this section contain?`,
    };

    return prompts[sectionType.toLowerCase()] || prompts.custom || 'What information would you like to include in this section?';
  }

  /**
   * Generate follow-up question based on previous answers
   */
  private static async generateFollowUpQuestion(
    state: SectionGenerationState,
    draftId: number
  ): Promise<string> {
    const previousQA = state.questions
      .filter(q => q.answer)
      .map(q => `Q: ${q.question}\nA: ${q.answer}`)
      .join('\n\n');

    const chatHistory = await prisma.opinionChatMessage.findMany({
      where: { 
        opinionDraftId: draftId,
        sectionGenerationId: null,
      },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    const question = await InterviewAgent.generateQuestion([...chatHistory], previousQA);
    return question;
  }

  /**
   * Assess if more questions are needed
   */
  private static async assessCompleteness(
    state: SectionGenerationState,
    draftId: number
  ): Promise<boolean> {
    // Simple heuristic: ask 2-4 questions depending on section type
    const maxQuestions: Record<string, number> = {
      facts: 3,
      issue: 2,
      law: 3,
      analysis: 4,
      application: 4,
      conclusion: 2,
      custom: 3,
    };

    const max = maxQuestions[state.sectionType.toLowerCase()] || 3;
    const answeredCount = state.questions.filter(q => q.answer).length;

    // Always ask at least 2 questions, but no more than max
    if (answeredCount < 2) return true;
    if (answeredCount >= max) return false;

    // For middle range, use assessment
    const allAnswers = state.questions
      .filter(q => q.answer)
      .map(q => q.answer)
      .join(' ');

    // Simple length check - if answers are substantial, we're probably done
    return allAnswers.length < 200;
  }

  /**
   * Generate Facts section
   */
  private static async generateFactsSection(
    state: SectionGenerationState,
    sectionQA: OpinionChatMessage[],
    previousSections: OpinionSection[],
    draftId: number,
    fullContext: string
  ): Promise<string> {
    // Include document context in facts summarization
    const contextWithDocs = fullContext || sectionQA.map(m => m.content).join('\n');
    const facts = await InterviewAgent.summarizeFacts(sectionQA);
    
    // If we have documents, prepend document context
    if (state.documentFindings.length > 0) {
      const docContext = `\n\n**Referenced Documents:**\n${state.documentFindings.map(d => `- ${d.fileName}: ${d.content.substring(0, 200)}...`).join('\n')}`;
      return facts + docContext;
    }
    
    return facts;
  }

  /**
   * Generate Issue section
   */
  private static async generateIssueSection(
    state: SectionGenerationState,
    sectionQA: OpinionChatMessage[],
    chatHistory: OpinionChatMessage[],
    previousSections: OpinionSection[],
    fullContext: string
  ): Promise<string> {
    const allMessages = [...chatHistory, ...sectionQA];
    const issue = allMessages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' ');

    // Extract and format the key tax issue with document context
    const issueText = await InterviewAgent.summarizeFacts(sectionQA);
    
    // Add document references if available
    if (state.documentFindings.length > 0) {
      const docRefs = `\n\n**Documents Referenced:**\n${[...new Set(state.documentFindings.map(d => d.fileName))].map(name => `- ${name}`).join('\n')}`;
      return issueText + docRefs;
    }
    
    return issueText;
  }

  /**
   * Generate Law section
   */
  private static async generateLawSection(
    state: SectionGenerationState,
    sectionQA: OpinionChatMessage[],
    previousSections: OpinionSection[],
    draftId: number,
    fullContext: string
  ): Promise<string> {
    const facts = this.getPreviousSectionContent(previousSections, 'Facts');
    const issue = this.getPreviousSectionContent(previousSections, 'Issue');
    
    // Include full context in research
    const contextEnhancedIssue = `${issue}\n\nContext:\n${fullContext}`;
    
    const research = await ResearchAgent.conductResearch(
      draftId,
      contextEnhancedIssue || 'tax issue from conversation',
      facts || 'facts from conversation'
    );

    const lawSection = `**Relevant Legislation:**\n${research.relevantLaw.map(l => `- ${l}`).join('\n')}\n\n**Legal Framework:**\n${research.documentFindings}\n\n**Precedents:**\n${research.precedents.map(p => `- ${p}`).join('\n')}`;
    
    return lawSection;
  }

  /**
   * Generate Analysis section
   */
  private static async generateAnalysisSection(
    state: SectionGenerationState,
    sectionQA: OpinionChatMessage[],
    previousSections: OpinionSection[],
    draftId: number,
    fullContext: string
  ): Promise<string> {
    const facts = this.getPreviousSectionContent(previousSections, 'Facts');
    const issue = this.getPreviousSectionContent(previousSections, 'Issue');
    const law = this.getPreviousSectionContent(previousSections, 'Law');

    // Include full context in analysis
    const contextEnhancedFacts = `${facts}\n\nAdditional Context:\n${fullContext}`;

    const analysis = await AnalysisAgent.analyzeTaxPosition(
      contextEnhancedFacts || 'facts',
      law || 'relevant law',
      issue || 'tax issue'
    );

    const analysisSection = `**Main Issues:**\n${analysis.mainIssues.map(i => `- ${i}`).join('\n')}\n\n**Analysis:**\n${analysis.legalAnalysis}\n\n**Conclusion:**\n${analysis.conclusion}`;
    
    return analysisSection;
  }

  /**
   * Generate Conclusion section
   */
  private static async generateConclusionSection(
    state: SectionGenerationState,
    sectionQA: OpinionChatMessage[],
    previousSections: OpinionSection[],
    draftId: number,
    fullContext: string
  ): Promise<string> {
    const issue = this.getPreviousSectionContent(previousSections, 'Issue');
    const analysisSection = previousSections.find(s => 
      s.sectionType.toLowerCase() === 'analysis' || s.sectionType.toLowerCase() === 'application'
    );
    const analysisContent = analysisSection?.content || 'Analysis based on facts and law';

    // Include full context in conclusion
    const contextEnhancedAnalysis = `${analysisContent}\n\nFull Context:\n${fullContext}`;

    const conclusion = await DraftingAgent.draftConclusionSection(
      issue || 'Tax issue from discussion',
      contextEnhancedAnalysis,
      'Risks assessed from conversation'
    );

    return conclusion.content;
  }

  /**
   * Generate custom section
   */
  private static async generateCustomSection(
    state: SectionGenerationState,
    sectionQA: OpinionChatMessage[],
    previousSections: OpinionSection[],
    draftId: number,
    fullContext: string
  ): Promise<string> {
    const allPreviousContent = previousSections
      .map(s => `${s.title}:\n${s.content}`)
      .join('\n\n');

    const qaContent = sectionQA
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n\n');

    // Combine all context
    const combinedContext = `${allPreviousContent}\n\n${fullContext}`;

    // For custom sections, use the application section drafter as it's most flexible
    const content = await DraftingAgent.draftApplicationSection(
      qaContent || 'Custom section content from user input',
      combinedContext || 'No previous context',
      'User-defined custom section'
    );

    return content.content;
  }

  /**
   * Helper: Get content from previous section by type
   */
  private static getPreviousSectionContent(
    sections: OpinionSection[],
    sectionType: string
  ): string {
    const section = sections.find(s => 
      s.sectionType.toLowerCase() === sectionType.toLowerCase()
    );
    return section?.content || '';
  }

  /**
   * Helper: Build full context including previous sections, Q&A, and documents
   */
  private static buildFullContext(
    state: SectionGenerationState,
    previousSections: OpinionSection[]
  ): string {
    const sections = [];
    
    // Previous sections
    if (previousSections.length > 0) {
      sections.push('## Previous Sections:');
      sections.push(
        previousSections.map(s => `### ${s.title}\n${s.content}`).join('\n\n')
      );
      sections.push('');
    }
    
    // Q&A History
    if (state.questions.length > 0) {
      sections.push('## Q&A History:');
      sections.push(
        state.questions
          .filter(q => q.answer)
          .map((q, i) => `Q${i+1}: ${q.question}\nA${i+1}: ${q.answer}`)
          .join('\n\n')
      );
      sections.push('');
    }
    
    // Referenced Documents
    if (state.documentFindings.length > 0) {
      sections.push('## Referenced Documents:');
      sections.push(
        state.documentFindings.map(d => 
          `**${d.fileName}** (${d.category}):\n${d.content}`
        ).join('\n\n')
      );
    }
    
    return sections.join('\n');
  }

  /**
   * Helper: Build context summary from chat and sections
   */
  private static buildContextSummary(
    chatHistory: OpinionChatMessage[],
    existingSections: OpinionSection[]
  ): string {
    if (existingSections.length === 0 && chatHistory.length === 0) {
      return '';
    }

    const parts = [];
    if (chatHistory.length > 0) {
      parts.push('our chat');
    }
    if (existingSections.length > 0) {
      parts.push(`the ${existingSections.length} existing section(s)`);
    }

    return ` and ${parts.join(' and ')}`;
  }
}


