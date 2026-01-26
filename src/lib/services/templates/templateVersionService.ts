/**
 * Template Version Service
 * Manages template versioning including creation, activation, and history
 */

import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';

export interface CreateVersionData {
  templateId: number;
  changeNotes?: string;
  createdBy: string;
}

export interface TemplateVersionWithSections {
  id: number;
  templateId: number;
  version: number;
  name: string;
  description: string | null;
  type: string;
  serviceLine: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  changeNotes: string | null;
  TemplateSectionVersion: Array<{
    id: number;
    sectionKey: string;
    title: string;
    content: string;
    isRequired: boolean;
    isAiAdaptable: boolean;
    order: number;
    applicableServiceLines: string | null;
    applicableProjectTypes: string | null;
  }>;
}

export interface VersionHistoryItem {
  id: number;
  version: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  changeNotes: string | null;
  _count: {
    TemplateSectionVersion: number;
    TaskEngagementLetter: number;
  };
}

/**
 * Create a new version from current template state
 * Deactivates previous active version and creates new active version
 */
export async function createNewVersion(data: CreateVersionData): Promise<TemplateVersionWithSections> {
  return await prisma.$transaction(async (tx) => {
    // Get current template with sections
    const template = await tx.template.findUnique({
      where: { id: data.templateId },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        serviceLine: true,
        TemplateSection: {
          select: {
            sectionKey: true,
            title: true,
            content: true,
            isRequired: true,
            isAiAdaptable: true,
            order: true,
            applicableServiceLines: true,
            applicableProjectTypes: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Get next version number
    const latestVersion = await tx.templateVersion.findFirst({
      where: { templateId: data.templateId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const nextVersion = (latestVersion?.version || 0) + 1;

    // Deactivate all previous versions
    await tx.templateVersion.updateMany({
      where: { templateId: data.templateId, isActive: true },
      data: { isActive: false },
    });

    // Create new version
    const newVersion = await tx.templateVersion.create({
      data: {
        templateId: data.templateId,
        version: nextVersion,
        name: template.name,
        description: template.description,
        type: template.type,
        serviceLine: template.serviceLine,
        isActive: true,
        createdBy: data.createdBy,
        changeNotes: data.changeNotes,
        TemplateSectionVersion: {
          create: template.TemplateSection.map((section) => ({
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
      select: {
        id: true,
        templateId: true,
        version: true,
        name: true,
        description: true,
        type: true,
        serviceLine: true,
        isActive: true,
        createdBy: true,
        createdAt: true,
        changeNotes: true,
        TemplateSectionVersion: {
          select: {
            id: true,
            sectionKey: true,
            title: true,
            content: true,
            isRequired: true,
            isAiAdaptable: true,
            order: true,
            applicableServiceLines: true,
            applicableProjectTypes: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    // Update template currentVersion
    await tx.template.update({
      where: { id: data.templateId },
      data: { currentVersion: nextVersion },
    });

    logger.info('Created template version', {
      templateId: data.templateId,
      version: nextVersion,
      sectionCount: template.TemplateSection.length,
    });

    return newVersion;
  });
}

/**
 * Get version history for a template
 * Returns all versions sorted by version number descending (newest first)
 */
export async function getVersionHistory(templateId: number): Promise<VersionHistoryItem[]> {
  const versions = await prisma.templateVersion.findMany({
    where: { templateId },
    select: {
      id: true,
      version: true,
      name: true,
      description: true,
      isActive: true,
      createdBy: true,
      createdAt: true,
      changeNotes: true,
      _count: {
        select: {
          TemplateSectionVersion: true,
          TaskEngagementLetter: true,
        },
      },
    },
    orderBy: { version: 'desc' },
  });

  return versions;
}

/**
 * Get specific version with sections
 */
export async function getVersion(versionId: number): Promise<TemplateVersionWithSections | null> {
  const version = await prisma.templateVersion.findUnique({
    where: { id: versionId },
    select: {
      id: true,
      templateId: true,
      version: true,
      name: true,
      description: true,
      type: true,
      serviceLine: true,
      isActive: true,
      createdBy: true,
      createdAt: true,
      changeNotes: true,
      TemplateSectionVersion: {
        select: {
          id: true,
          sectionKey: true,
          title: true,
          content: true,
          isRequired: true,
          isAiAdaptable: true,
          order: true,
          applicableServiceLines: true,
          applicableProjectTypes: true,
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  return version;
}

/**
 * Get active version for template generation
 */
export async function getActiveVersion(templateId: number): Promise<TemplateVersionWithSections | null> {
  const version = await prisma.templateVersion.findFirst({
    where: { templateId, isActive: true },
    select: {
      id: true,
      templateId: true,
      version: true,
      name: true,
      description: true,
      type: true,
      serviceLine: true,
      isActive: true,
      createdBy: true,
      createdAt: true,
      changeNotes: true,
      TemplateSectionVersion: {
        select: {
          id: true,
          sectionKey: true,
          title: true,
          content: true,
          isRequired: true,
          isAiAdaptable: true,
          order: true,
          applicableServiceLines: true,
          applicableProjectTypes: true,
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  return version;
}

/**
 * Activate a specific version (deactivates all others for this template)
 */
export async function activateVersion(versionId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const version = await tx.templateVersion.findUnique({
      where: { id: versionId },
      select: { templateId: true, version: true },
    });

    if (!version) {
      throw new Error('Version not found');
    }

    // Deactivate all versions for this template
    await tx.templateVersion.updateMany({
      where: { templateId: version.templateId },
      data: { isActive: false },
    });

    // Activate selected version
    await tx.templateVersion.update({
      where: { id: versionId },
      data: { isActive: true },
    });

    // Update template currentVersion
    await tx.template.update({
      where: { id: version.templateId },
      data: { currentVersion: version.version },
    });

    logger.info('Activated template version', { 
      versionId, 
      templateId: version.templateId,
      version: version.version,
    });
  });
}

/**
 * Restore a version to current template (copies sections back to main template)
 * This allows editing an old version by making it the current template state
 */
export async function restoreVersion(versionId: number, restoredBy: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Get version with sections
    const version = await tx.templateVersion.findUnique({
      where: { id: versionId },
      select: {
        templateId: true,
        version: true,
        name: true,
        description: true,
        type: true,
        serviceLine: true,
        TemplateSectionVersion: {
          select: {
            sectionKey: true,
            title: true,
            content: true,
            isRequired: true,
            isAiAdaptable: true,
            order: true,
            applicableServiceLines: true,
            applicableProjectTypes: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!version) {
      throw new Error('Version not found');
    }

    // Delete current sections
    await tx.templateSection.deleteMany({
      where: { templateId: version.templateId },
    });

    // Restore sections from version
    await tx.templateSection.createMany({
      data: version.TemplateSectionVersion.map((section) => ({
        templateId: version.templateId,
        sectionKey: section.sectionKey,
        title: section.title,
        content: section.content,
        isRequired: section.isRequired,
        isAiAdaptable: section.isAiAdaptable,
        order: section.order,
        applicableServiceLines: section.applicableServiceLines,
        applicableProjectTypes: section.applicableProjectTypes,
      })),
    });

    // Update template metadata
    await tx.template.update({
      where: { id: version.templateId },
      data: {
        name: version.name,
        description: version.description,
        type: version.type,
        serviceLine: version.serviceLine,
      },
    });

    logger.info('Restored template from version', {
      templateId: version.templateId,
      versionId,
      version: version.version,
      restoredBy,
      sectionCount: version.TemplateSectionVersion.length,
    });
  });
}

/**
 * Check if a template has any versions
 */
export async function hasVersions(templateId: number): Promise<boolean> {
  const count = await prisma.templateVersion.count({
    where: { templateId },
  });

  return count > 0;
}

/**
 * Get version count for a template
 */
export async function getVersionCount(templateId: number): Promise<number> {
  return await prisma.templateVersion.count({
    where: { templateId },
  });
}
