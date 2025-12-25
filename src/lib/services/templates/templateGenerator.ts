import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';
import { getApplicableTemplates } from './templateService';
import { adaptSection } from './aiAdaptation';

export interface TaskContext {
  taskId: number;
  taskName: string;
  taskType: string;
  serviceLine: string;
  taxYear?: number;
  taxPeriodStart?: Date;
  taxPeriodEnd?: Date;
  taskDescription?: string;
  clientCode?: string;
  clientName?: string;
  partnerName?: string;
}

export interface GeneratedTemplate {
  content: string;
  sectionsUsed: Array<{
    sectionKey: string;
    title: string;
    wasAiAdapted: boolean;
  }>;
}

/**
 * Generate a document from template for a specific task
 */
export async function generateFromTemplate(
  templateId: number,
  taskContext: TaskContext,
  useAiAdaptation: boolean = true
): Promise<GeneratedTemplate> {
  try {
    // Get template with sections
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      include: {
        TemplateSection: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Filter sections applicable to this task
    const applicableSections = template.TemplateSection.filter((section) => {
      // If section has no applicability constraints, it's always included
      if (!section.applicableServiceLines && !section.applicableProjectTypes) {
        return true;
      }

      // Check service line applicability
      if (section.applicableServiceLines) {
        const serviceLines = JSON.parse(section.applicableServiceLines);
        if (!serviceLines.includes(taskContext.serviceLine)) {
          return false;
        }
      }

      // Check task type applicability
      if (section.applicableProjectTypes) {
        const taskTypes = JSON.parse(section.applicableProjectTypes);
        if (!taskTypes.includes(taskContext.taskType)) {
          return false;
        }
      }

      return true;
    });

    // Build context data for placeholder replacement
    const contextData = buildContextData(taskContext);

    // Process sections
    const processedSections: Array<{
      sectionKey: string;
      title: string;
      content: string;
      wasAiAdapted: boolean;
    }> = [];

    for (const section of applicableSections) {
      let content = section.content;
      let wasAiAdapted = false;

      // Replace placeholders first
      content = replacePlaceholders(content, contextData);

      // Apply AI adaptation if needed
      if (useAiAdaptation && section.isAiAdaptable) {
        try {
          content = await adaptSection(section.title, content, taskContext);
          wasAiAdapted = true;
        } catch (error) {
          logger.error(`Failed to adapt section ${section.title}:`, error);
          // Fall back to placeholder-replaced content
        }
      }

      processedSections.push({
        sectionKey: section.sectionKey,
        title: section.title,
        content,
        wasAiAdapted,
      });
    }

    // Combine all sections into final document
    const finalContent = processedSections
      .map((section) => section.content)
      .join('\n\n');

    return {
      content: finalContent,
      sectionsUsed: processedSections.map((s) => ({
        sectionKey: s.sectionKey,
        title: s.title,
        wasAiAdapted: s.wasAiAdapted,
      })),
    };
  } catch (error) {
    logger.error('Error generating from template:', error);
    throw new Error('Failed to generate document from template');
  }
}

/**
 * Get the best matching template for a task
 */
export async function getBestTemplateForTask(
  taskId: number,
  templateType: string = 'ENGAGEMENT_LETTER'
): Promise<number | null> {
  try {
    // Get task details
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        ServLineCode: true,
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Get applicable templates for this service line
    const templates = await getApplicableTemplates(
      templateType,
      task.ServLineCode
    );

    if (templates.length === 0) {
      return null;
    }

    // Prioritize templates:
    // 1. Service line match
    // 2. Global template

    const serviceLineMatch = templates.find(
      (t) => t.serviceLine === task.ServLineCode
    );
    if (serviceLineMatch) return serviceLineMatch.id;

    // Return first global template
    const globalTemplate = templates.find((t) => !t.serviceLine);
    if (globalTemplate) return globalTemplate.id;

    // Return first template if available
    return templates[0]?.id ?? null;
  } catch (error) {
    logger.error('Error finding best template:', error);
    throw new Error('Failed to find best template');
  }
}

/**
 * Build context data from task for placeholder replacement
 */
function buildContextData(context: TaskContext): Record<string, string> {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return {
    taskName: context.taskName || '',
    taskType: context.taskType?.replace(/_/g, ' ') || '',
    serviceLine: context.serviceLine || '',
    taxYear: context.taxYear?.toString() || '',
    taxPeriodStart: context.taxPeriodStart
      ? context.taxPeriodStart.toLocaleDateString()
      : '',
    taxPeriodEnd: context.taxPeriodEnd
      ? context.taxPeriodEnd.toLocaleDateString()
      : '',
    taskDescription: context.taskDescription || '',
    projectDescription: context.taskDescription || '', // Map taskDescription to projectDescription for template compatibility
    clientName: context.clientName || '',
    clientCode: context.clientCode || '',
    partnerName: context.partnerName || '',
    currentDate,
  };
}

/**
 * Replace placeholders in content with actual values
 */
function replacePlaceholders(
  content: string,
  data: Record<string, string>
): string {
  let result = content;

  // Replace all {{placeholder}} patterns
  Object.keys(data).forEach((key) => {
    const placeholder = `{{${key}}}`;
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    result = result.replace(regex, data[key] || '');
  });

  return result;
}

/**
 * Get task context from database
 */
export async function getTaskContext(taskId: number): Promise<TaskContext> {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        Client: true,
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    return {
      taskId: task.id,
      taskName: task.TaskDesc,
      taskType: task.TaskCode, // Using TaskCode as taskType
      serviceLine: task.ServLineCode,
      taxYear: undefined, // Task model doesn't have taxYear field
      taxPeriodStart: undefined, // Task model doesn't have taxPeriodStart field
      taxPeriodEnd: undefined, // Task model doesn't have taxPeriodEnd field
      taskDescription: task.TaskDesc,
      clientCode: task.Client?.clientCode || undefined,
      clientName: task.Client?.clientNameFull || undefined,
      partnerName: task.Client?.clientPartner || undefined,
    };
  } catch (error) {
    logger.error('Error getting task context:', error);
    throw new Error('Failed to get task context');
  }
}


