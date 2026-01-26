import { generateText } from 'ai';
import { defaultModel } from '@/lib/ai/config';
import { logger } from '@/lib/utils/logger';
import type { TaskContext } from './templateGenerator';

/**
 * Adapt a template section using AI
 */
export async function adaptSection(
  sectionTitle: string,
  sectionContent: string,
  context: TaskContext
): Promise<string> {
  try {
    const prompt = buildAdaptationPrompt(sectionTitle, sectionContent, context);

    const { text } = await generateText({
      model: defaultModel,
      prompt,
    });

    logger.info(`AI adapted section: ${sectionTitle}`);
    return text.trim();
  } catch (error) {
    logger.error(`Error adapting section ${sectionTitle}:`, error);
    throw error;
  }
}

/**
 * Build the prompt for AI section adaptation
 */
function buildAdaptationPrompt(
  sectionTitle: string,
  sectionContent: string,
  context: TaskContext
): string {
  return `You are a professional engagement letter writer for Forvis Mazars, a global accounting and advisory firm.

Your task is to adapt the following engagement letter section to be specific to the client and task described below.

**Client & Task Context:**
- Client: ${context.clientName || 'Client'} (${context.clientCode || 'N/A'})
- Task: ${context.taskName}
- Task Type: ${context.taskType?.replace(/_/g, ' ') || 'N/A'}
- Service Line: ${context.serviceLine}
${context.taxYear ? `- Tax Year: ${context.taxYear}` : ''}
${context.taskDescription ? `- Description: ${context.taskDescription}` : ''}

**Section to Adapt:**
Title: ${sectionTitle}

Original Content:
${sectionContent}

**Instructions:**
1. Preserve the markdown structure and formatting exactly
2. Maintain a professional, formal tone appropriate for an engagement letter
3. Customize the content to be specific to this client and project type
4. Replace generic placeholders with specific, relevant details where appropriate
5. Keep the core message and intent of the original section intact
6. Do not add new sections or remove existing structure
7. Ensure the adapted content flows naturally and professionally

Return ONLY the adapted section content, preserving all markdown formatting.`;
}

/**
 * Batch adapt multiple sections
 */
export async function adaptSections(
  sections: Array<{ title: string; content: string }>,
  context: TaskContext
): Promise<Array<{ title: string; content: string }>> {
  const adapted: Array<{ title: string; content: string }> = [];

  for (const section of sections) {
    try {
      const adaptedContent = await adaptSection(
        section.title,
        section.content,
        context
      );
      adapted.push({
        title: section.title,
        content: adaptedContent,
      });
    } catch (error) {
      logger.error(`Failed to adapt section ${section.title}, using original:`, error);
      // Fall back to original content
      adapted.push(section);
    }
  }

  return adapted;
}

/**
 * Preview AI adaptation without saving
 */
export async function previewAdaptation(
  sectionTitle: string,
  sectionContent: string,
  context: TaskContext
): Promise<{
  original: string;
  adapted: string;
}> {
  try {
    const adapted = await adaptSection(sectionTitle, sectionContent, context);
    return {
      original: sectionContent,
      adapted,
    };
  } catch (error) {
    logger.error('Error previewing adaptation:', error);
    throw new Error('Failed to preview AI adaptation');
  }
}


