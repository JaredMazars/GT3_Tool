import { generateText } from 'ai';
import { models, getModelParams } from '@/lib/ai/config';
import { logger } from '@/lib/utils/logger';
import { OpinionChatMessage } from '@/types';

export interface InterviewQuestion {
  question: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
}

export class InterviewAgent {
  /**
   * Analyze conversation history and generate next clarifying question
   */
  static async generateQuestion(
    conversationHistory: OpinionChatMessage[],
    currentContext?: string
  ): Promise<string> {
    try {
      const historyText = conversationHistory
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join('\n');

      const { text } = await generateText({
        model: models.mini,
        ...getModelParams({ temperature: 0.7 }),
        system: `You are an expert South African tax consultant conducting an interview to gather information for a tax opinion.

<role_and_expertise>
- You specialize in South African Income Tax Act and SARS regulations
- You conduct professional, structured interviews to gather facts
- You ask clear, focused questions one at a time
- You identify gaps in information systematically
</role_and_expertise>

<interview_strategy>
1. Start with understanding the high-level scenario and tax issue
2. Gather key facts about the taxpayer (entity type, residence, etc.)
3. Understand the specific transaction or arrangement
4. Identify timing and amounts involved
5. Explore tax treatment considerations
6. Identify any supporting documentation needed
7. Uncover potential complications or alternative views
</interview_strategy>

<question_guidelines>
- Ask ONE clear, specific question at a time
- Build on previous answers naturally
- Avoid yes/no questions when possible - ask for details
- Use professional but accessible language
- Reference specific tax law sections when relevant
- Acknowledge previous answers before asking next question
- Don't repeat questions already answered
- Identify missing critical information
</question_guidelines>

<south_african_tax_context>
Consider these aspects when relevant:
- Residence and source principles
- Deductibility under s11-13
- Capital vs revenue distinction
- Transfer pricing and controlled transactions
- Withholding tax obligations (dividends, interest, royalties)
- CGT implications
- Timing of income recognition and deductions
- Anti-avoidance provisions (Part IIA, GAAR)
</south_african_tax_context>`,
        prompt: `<conversation_history>
${historyText}
</conversation_history>

${currentContext ? `<additional_context>\n${currentContext}\n</additional_context>\n` : ''}

<task>
Based on the conversation so far, generate the next most important question to ask the user to gather essential information for the tax opinion. 

If the conversation is just starting, begin by understanding the core tax scenario and issue. If substantial information has been gathered, focus on clarifying details, identifying gaps, or exploring implications.

Provide ONLY the question text - no explanations or preamble.
</task>`,
      });

      return text.trim();
    } catch (error) {
      logger.error('Error generating interview question:', error);
      throw new Error('Failed to generate interview question');
    }
  }

  /**
   * Analyze conversation to identify what facts have been established
   */
  static async summarizeFacts(
    conversationHistory: OpinionChatMessage[]
  ): Promise<string> {
    try {
      const historyText = conversationHistory
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join('\n');

      const { text } = await generateText({
        model: models.mini,
        ...getModelParams({ temperature: 0.3 }),
        system: `You are an expert at extracting and organizing factual information from tax consultation conversations.

<task>
Analyze the conversation and create a clear, structured summary of all established facts relevant to the tax opinion. Organize facts logically and flag any uncertainties or gaps.
</task>

<output_format>
Format your summary with clear sections:

## TAXPAYER INFORMATION
[Entity details, residence, industry, etc.]

## TAX ISSUE OVERVIEW
[Brief description of the core tax question]

## KEY FACTS
[Chronological or logical organization of facts]

## TRANSACTION DETAILS
[Amounts, dates, parties involved]

## TAX CONSIDERATIONS IDENTIFIED
[Relevant tax law sections, principles, issues raised]

## GAPS / UNCERTAINTIES
[Information still needed or unclear]

Use bullet points for clarity. Include specific amounts, dates, and references mentioned. Be precise and factual - don't add interpretations or conclusions.
</output_format>`,
        prompt: `<conversation_history>
${historyText}
</conversation_history>

Analyze this conversation and provide a comprehensive summary of established facts for the tax opinion.`,
      });

      return text.trim();
    } catch (error) {
      logger.error('Error summarizing facts:', error);
      throw new Error('Failed to summarize facts');
    }
  }

  /**
   * Assess completeness of gathered information
   */
  static async assessCompleteness(
    conversationHistory: OpinionChatMessage[]
  ): Promise<{
    completeness: number;
    missingCritical: string[];
    missingDesirable: string[];
    readyToProceed: boolean;
  }> {
    try {
      const historyText = conversationHistory
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join('\n');

      const { text } = await generateText({
        model: models.mini,
        ...getModelParams({ temperature: 0.3 }),
        system: `You are an expert at assessing whether sufficient information has been gathered for a tax opinion.

<task>
Evaluate the completeness of information gathered and identify gaps.
</task>

<critical_information>
For any tax opinion, we typically need:
- Clear definition of the tax issue/question
- Taxpayer identity and status
- Relevant facts about the transaction/arrangement
- Timing and amounts
- Applicable tax law sections
- Any existing SARS correspondence or positions
</critical_information>

<output_format>
Provide your assessment in this exact JSON format:
{
  "completeness": <number 0-100>,
  "missingCritical": ["item1", "item2"],
  "missingDesirable": ["item1", "item2"],
  "readyToProceed": <true/false>
}

Set readyToProceed to true only if all critical information is available.
</output_format>`,
        prompt: `<conversation_history>
${historyText}
</conversation_history>

Assess the completeness of information gathered and identify any gaps.`,
      });

      return JSON.parse(text.trim());
    } catch (error) {
      logger.error('Error assessing completeness:', error);
      // Return safe default
      return {
        completeness: 50,
        missingCritical: ['Unable to assess - please review manually'],
        missingDesirable: [],
        readyToProceed: false,
      };
    }
  }
}


