import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';

export interface TemplateFilter {
  type?: string;
  serviceLine?: string;
  projectType?: string;
  active?: boolean;
  search?: string;
}

export interface CreateTemplateData {
  name: string;
  description?: string;
  type: string;
  serviceLine?: string;
  projectType?: string;
  content: string;
  active?: boolean;
  createdBy: string;
}

export interface UpdateTemplateData {
  name?: string;
  description?: string;
  type?: string;
  serviceLine?: string | null;
  projectType?: string | null;
  content?: string;
  active?: boolean;
}

export interface CreateTemplateSectionData {
  templateId: number;
  sectionKey: string;
  title: string;
  content: string;
  isRequired?: boolean;
  isAiAdaptable?: boolean;
  order: number;
  applicableServiceLines?: string[];
  applicableProjectTypes?: string[];
}

export interface UpdateTemplateSectionData {
  sectionKey?: string;
  title?: string;
  content?: string;
  isRequired?: boolean;
  isAiAdaptable?: boolean;
  order?: number;
  applicableServiceLines?: string[] | null;
  applicableProjectTypes?: string[] | null;
}

/**
 * Get all templates with optional filtering
 */
export async function getTemplates(filter?: TemplateFilter) {
  try {
    interface TemplateWhere {
      type?: string;
      serviceLine?: string;
      projectType?: string;
      active?: boolean;
      OR?: Array<{
        name?: { contains: string };
        description?: { contains: string };
      }>;
    }

    const where: TemplateWhere = {};

    if (filter?.type) {
      where.type = filter.type;
    }

    if (filter?.serviceLine) {
      where.serviceLine = filter.serviceLine;
    }

    if (filter?.projectType) {
      where.projectType = filter.projectType;
    }

    if (filter?.active !== undefined) {
      where.active = filter.active;
    }

    if (filter?.search) {
      where.OR = [
        { name: { contains: filter.search } },
        { description: { contains: filter.search } },
      ];
    }

    const templates = await prisma.template.findMany({
      where,
      include: {
        TemplateSection: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return templates;
  } catch (error) {
    logger.error('Error fetching templates:', error);
    throw new Error('Failed to fetch templates');
  }
}

/**
 * Get a single template by ID
 */
export async function getTemplateById(id: number) {
  try {
    const template = await prisma.template.findUnique({
      where: { id },
      include: {
        TemplateSection: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return template;
  } catch (error) {
    logger.error('Error fetching template:', error);
    throw new Error('Failed to fetch template');
  }
}

/**
 * Create a new template
 */
export async function createTemplate(data: CreateTemplateData) {
  try {
    const template = await prisma.template.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        serviceLine: data.serviceLine,
        projectType: data.projectType,
        content: data.content,
        active: data.active ?? true,
        createdBy: data.createdBy,
      },
      include: {
        TemplateSection: {
          orderBy: { order: 'asc' },
        },
      },
    });

    logger.info(`Created template: ${template.name} (ID: ${template.id})`);
    return template;
  } catch (error) {
    logger.error('Error creating template:', error);
    throw new Error('Failed to create template');
  }
}

/**
 * Update an existing template
 */
export async function updateTemplate(id: number, data: UpdateTemplateData) {
  try {
    const template = await prisma.template.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.type && { type: data.type }),
        ...(data.serviceLine !== undefined && { serviceLine: data.serviceLine }),
        ...(data.projectType !== undefined && { projectType: data.projectType }),
        ...(data.content && { content: data.content }),
        ...(data.active !== undefined && { active: data.active }),
      },
      include: {
        TemplateSection: {
          orderBy: { order: 'asc' },
        },
      },
    });

    logger.info(`Updated template: ${template.name} (ID: ${template.id})`);
    return template;
  } catch (error) {
    logger.error('Error updating template:', error);
    throw new Error('Failed to update template');
  }
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: number) {
  try {
    await prisma.template.delete({
      where: { id },
    });

    logger.info(`Deleted template ID: ${id}`);
  } catch (error) {
    logger.error('Error deleting template:', error);
    throw new Error('Failed to delete template');
  }
}

/**
 * Create a template section
 */
export async function createTemplateSection(data: CreateTemplateSectionData) {
  try {
    const section = await prisma.templateSection.create({
      data: {
        templateId: data.templateId,
        sectionKey: data.sectionKey,
        title: data.title,
        content: data.content,
        isRequired: data.isRequired ?? true,
        isAiAdaptable: data.isAiAdaptable ?? false,
        order: data.order,
        applicableServiceLines: data.applicableServiceLines
          ? JSON.stringify(data.applicableServiceLines)
          : null,
        applicableProjectTypes: data.applicableProjectTypes
          ? JSON.stringify(data.applicableProjectTypes)
          : null,
      },
    });

    logger.info(`Created template section: ${section.title} (ID: ${section.id})`);
    return section;
  } catch (error) {
    logger.error('Error creating template section:', error);
    throw new Error('Failed to create template section');
  }
}

/**
 * Update a template section
 */
export async function updateTemplateSection(
  id: number,
  data: UpdateTemplateSectionData
) {
  try {
    interface TemplateSectionUpdateData {
      sectionKey?: string;
      title?: string;
      content?: string;
      isRequired?: boolean;
      isAiAdaptable?: boolean;
      order?: number;
      applicableServiceLines?: string | null;
      applicableProjectTypes?: string | null;
    }

    const updateData: TemplateSectionUpdateData = {};

    if (data.sectionKey) updateData.sectionKey = data.sectionKey;
    if (data.title) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.isRequired !== undefined) updateData.isRequired = data.isRequired;
    if (data.isAiAdaptable !== undefined)
      updateData.isAiAdaptable = data.isAiAdaptable;
    if (data.order !== undefined) updateData.order = data.order;
    if (data.applicableServiceLines !== undefined) {
      updateData.applicableServiceLines = data.applicableServiceLines
        ? JSON.stringify(data.applicableServiceLines)
        : null;
    }
    if (data.applicableProjectTypes !== undefined) {
      updateData.applicableProjectTypes = data.applicableProjectTypes
        ? JSON.stringify(data.applicableProjectTypes)
        : null;
    }

    const section = await prisma.templateSection.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Updated template section: ${section.title} (ID: ${section.id})`);
    return section;
  } catch (error) {
    logger.error('Error updating template section:', error);
    throw new Error('Failed to update template section');
  }
}

/**
 * Delete a template section
 */
export async function deleteTemplateSection(id: number) {
  try {
    await prisma.templateSection.delete({
      where: { id },
    });

    logger.info(`Deleted template section ID: ${id}`);
  } catch (error) {
    logger.error('Error deleting template section:', error);
    throw new Error('Failed to delete template section');
  }
}

/**
 * Get sections for a template
 */
export async function getTemplateSections(templateId: number) {
  try {
    const sections = await prisma.templateSection.findMany({
      where: { templateId },
      orderBy: { order: 'asc' },
    });

    return sections;
  } catch (error) {
    logger.error('Error fetching template sections:', error);
    throw new Error('Failed to fetch template sections');
  }
}

/**
 * Extract placeholders from template content
 */
export function extractPlaceholders(content: string): string[] {
  const placeholderRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
  const placeholders: string[] = [];
  let match;

  while ((match = placeholderRegex.exec(content)) !== null) {
    const placeholder = match[1];
    if (placeholder && !placeholders.includes(placeholder)) {
      placeholders.push(placeholder);
    }
  }

  return placeholders;
}

/**
 * Validate markdown format (basic validation)
 */
export function validateMarkdown(content: string): boolean {
  // Basic validation: check if content is non-empty and valid string
  if (!content || typeof content !== 'string') {
    return false;
  }

  // Could add more sophisticated markdown validation here
  return true;
}

/**
 * Get templates applicable to a specific service line and project type
 */
export async function getApplicableTemplates(
  type: string,
  serviceLine?: string,
  projectType?: string
) {
  try {
    interface ApplicableTemplateWhere {
      type: string;
      active: boolean;
      OR: Array<{
        serviceLine?: string | null;
        projectType?: string | null;
      }>;
    }

    const where: ApplicableTemplateWhere = {
      type,
      active: true,
      OR: [
        // Template with no specific service line/project type (global)
        { serviceLine: null, projectType: null },
        // Template matching service line only
        { serviceLine, projectType: null },
        // Template matching project type only
        { serviceLine: null, projectType },
        // Template matching both
        { serviceLine, projectType },
      ],
    };

    const templates = await prisma.template.findMany({
      where,
      include: {
        TemplateSection: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return templates;
  } catch (error) {
    logger.error('Error fetching applicable templates:', error);
    throw new Error('Failed to fetch applicable templates');
  }
}

/**
 * Copy an existing template with all its sections
 */
export async function copyTemplate(id: number, createdBy: string) {
  try {
    // Get the original template with all sections
    const originalTemplate = await prisma.template.findUnique({
      where: { id },
      include: {
        TemplateSection: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!originalTemplate) {
      throw new Error('Template not found');
    }

    // Create the new template with copied data
    const copiedTemplate = await prisma.template.create({
      data: {
        name: `${originalTemplate.name} (Copy)`,
        description: originalTemplate.description,
        type: originalTemplate.type,
        serviceLine: originalTemplate.serviceLine,
        projectType: originalTemplate.projectType,
        content: originalTemplate.content,
        active: false, // Set to inactive by default
        createdBy,
        TemplateSection: {
          create: originalTemplate.TemplateSection.map((section) => ({
            sectionKey: section.sectionKey,
            title: section.title,
            content: section.content,
            isRequired: section.isRequired,
            isAiAdaptable: section.isAiAdaptable,
            order: section.order,
            applicableServiceLines: section.applicableServiceLines,
            applicableProjectTypes: section.applicableProjectTypes,
          })),
        },
      },
      include: {
        TemplateSection: {
          orderBy: { order: 'asc' },
        },
      },
    });

    logger.info(`Copied template: ${originalTemplate.name} -> ${copiedTemplate.name} (ID: ${copiedTemplate.id})`);
    return copiedTemplate;
  } catch (error) {
    logger.error('Error copying template:', error);
    throw new Error('Failed to copy template');
  }
}


