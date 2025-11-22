import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { DocumentType, ClientDocument, DocumentsByType } from '@/types';

/**
 * GET /api/clients/[id]/documents
 * Fetch all documents across all projects for a client
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const clientId = parseInt(id);

    if (isNaN(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 });
    }

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get all projects for this client
    const projects = await prisma.project.findMany({
      where: { clientId },
      select: {
        id: true,
        name: true,
        engagementLetterPath: true,
        engagementLetterUploadedBy: true,
        engagementLetterUploadedAt: true,
      },
    });

    const projectIds = projects.map((p) => p.id);
    const projectMap = new Map(projects.map((p) => [p.id, p.name]));

    // Collect user IDs
    const userIds = new Set<string>();
    projects.forEach(p => {
      if (p.engagementLetterUploadedBy) userIds.add(p.engagementLetterUploadedBy);
    });

    // Fetch all documents
    const adminDocs = await prisma.administrationDocument.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: 'desc' },
    });
    adminDocs.forEach(doc => {
      if (doc.uploadedBy) userIds.add(doc.uploadedBy);
    });

    const adjustmentDocs = await prisma.adjustmentDocument.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: 'desc' },
    });
    adjustmentDocs.forEach(doc => {
      if (doc.uploadedBy) userIds.add(doc.uploadedBy);
    });

    const opinionDocs = await prisma.opinionDocument.findMany({
      where: {
        OpinionDraft: {
          projectId: { in: projectIds },
        },
      },
      include: {
        OpinionDraft: {
          select: {
            projectId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    opinionDocs.forEach(doc => {
      if (doc.uploadedBy) userIds.add(doc.uploadedBy);
    });

    const sarsDocs = await prisma.sarsResponse.findMany({
      where: {
        projectId: { in: projectIds },
        documentPath: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });
    sarsDocs.forEach(doc => {
      if (doc.createdBy) userIds.add(doc.createdBy);
    });

    // Look up user names NOW before mapping
    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map(u => [u.id, u.name || u.email]));

    // Initialize result structure
    const documentsByType: DocumentsByType = {
      engagementLetters: [],
      administration: [],
      adjustments: [],
      opinions: [],
      sars: [],
    };

    // Map engagement letters with user names
    for (const project of projects) {
      if (project.engagementLetterPath) {
        const pathParts = project.engagementLetterPath.split(/[/\\]/);
        const fileName = pathParts[pathParts.length - 1] || `${project.name}-engagement-letter.pdf`;
        documentsByType.engagementLetters.push({
          id: project.id,
          documentType: DocumentType.ENGAGEMENT_LETTER,
          fileName,
          fileType: fileName.split('.').pop() || 'pdf',
          fileSize: 0,
          filePath: project.engagementLetterPath,
          projectId: project.id,
          projectName: project.name,
          uploadedBy: project.engagementLetterUploadedBy ? userMap.get(project.engagementLetterUploadedBy) || project.engagementLetterUploadedBy : null,
          createdAt: project.engagementLetterUploadedAt || new Date(),
        });
      }
    }

    // Map administration documents with user names
    documentsByType.administration = adminDocs.map((doc) => ({
      id: doc.id,
      documentType: DocumentType.ADMINISTRATION,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      filePath: doc.filePath,
      projectId: doc.projectId,
      projectName: projectMap.get(doc.projectId) || 'Unknown Project',
      uploadedBy: doc.uploadedBy ? userMap.get(doc.uploadedBy) || doc.uploadedBy : null,
      createdAt: doc.createdAt,
      category: doc.category,
      description: doc.description,
      version: doc.version,
    }));

    // Map adjustment documents with user names
    documentsByType.adjustments = adjustmentDocs.map((doc) => ({
      id: doc.id,
      documentType: DocumentType.ADJUSTMENT,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      filePath: doc.filePath,
      projectId: doc.projectId,
      projectName: projectMap.get(doc.projectId) || 'Unknown Project',
      uploadedBy: doc.uploadedBy ? userMap.get(doc.uploadedBy) || doc.uploadedBy : null,
      createdAt: doc.createdAt,
      extractionStatus: doc.extractionStatus,
    }));

    // Map opinion documents with user names
    documentsByType.opinions = opinionDocs.map((doc) => ({
      id: doc.id,
      documentType: DocumentType.OPINION,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      filePath: doc.filePath,
      projectId: doc.OpinionDraft.projectId,
      projectName: projectMap.get(doc.OpinionDraft.projectId) || 'Unknown Project',
      uploadedBy: doc.uploadedBy ? userMap.get(doc.uploadedBy) || doc.uploadedBy : null,
      createdAt: doc.createdAt,
      category: doc.category,
    }));

    // Map SARS documents with user names
    documentsByType.sars = sarsDocs
      .filter((doc) => doc.documentPath)
      .map((doc) => {
        const pathParts = doc.documentPath!.split(/[/\\]/);
        const fileName = pathParts[pathParts.length - 1] || 'sars-document.pdf';
        return {
          id: doc.id,
          documentType: DocumentType.SARS,
          fileName,
          fileType: fileName.split('.').pop() || 'pdf',
          fileSize: 0,
          filePath: doc.documentPath!,
          projectId: doc.projectId,
          projectName: projectMap.get(doc.projectId) || 'Unknown Project',
          uploadedBy: doc.createdBy ? userMap.get(doc.createdBy) || doc.createdBy : null,
          createdAt: doc.createdAt,
          referenceNumber: doc.referenceNumber,
          subject: doc.subject,
        };
      });

    // Calculate total count
    const totalCount =
      documentsByType.engagementLetters.length +
      documentsByType.administration.length +
      documentsByType.adjustments.length +
      documentsByType.opinions.length +
      documentsByType.sars.length;

    return NextResponse.json(
      successResponse({
        documents: documentsByType,
        totalCount,
      })
    );
  } catch (error) {
    return handleApiError(error, 'GET /api/clients/[id]/documents');
  }
}
