import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { successResponse, parseGSClientID } from '@/lib/utils/apiUtils';
import { DocumentType, DocumentsByType } from '@/types';

/**
 * GET /api/clients/[id]/documents
 * Fetch all documents across all projects for a client
 */
export const GET = secureRoute.queryWithParams({
  feature: Feature.ACCESS_CLIENTS,
  handler: async (request, { user, params }) => {
    // Parse and validate GSClientID
    const GSClientID = parseGSClientID(params.id);

    // Get client by GSClientID
    const client = await prisma.client.findUnique({
      where: { GSClientID },
      select: { GSClientID: true },
    });

    if (!client) {
      throw new AppError(404, 'Client not found', ErrorCodes.NOT_FOUND);
    }

    // Get all projects for this client using GSClientID
    const projects = await prisma.task.findMany({
      where: { GSClientID: client.GSClientID },
      select: {
        id: true,
        TaskDesc: true,
        TaskEngagementLetter: {
          select: {
            filePath: true,
            uploadedBy: true,
            uploadedAt: true,
          },
        },
      },
      orderBy: [{ id: 'asc' }],
      take: 500, // Reasonable limit for client projects
    });

    // Early return if no projects
    if (projects.length === 0) {
      const response = NextResponse.json(
        successResponse({
          documents: {
            engagementLetters: [],
            administration: [],
            adjustments: [],
            opinions: [],
            sars: [],
          },
          totalCount: 0,
        })
      );
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }

    const taskIds = projects.map((p) => p.id);
    const taskMap = new Map(projects.map((p) => [p.id, p.TaskDesc]));

    // Fetch all documents in parallel for performance with limits
    const [adminDocs, adjustmentDocs, opinionDocs, sarsDocs] = await Promise.all([
      prisma.taskDocument.findMany({
        where: { taskId: { in: taskIds } },
        select: {
          id: true,
          fileName: true,
          fileType: true,
          fileSize: true,
          filePath: true,
          taskId: true,
          uploadedBy: true,
          createdAt: true,
          category: true,
          description: true,
          version: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 200,
      }),
      prisma.adjustmentDocument.findMany({
        where: { taskId: { in: taskIds } },
        select: {
          id: true,
          fileName: true,
          fileType: true,
          fileSize: true,
          filePath: true,
          taskId: true,
          uploadedBy: true,
          createdAt: true,
          extractionStatus: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 200,
      }),
      prisma.opinionDocument.findMany({
        where: {
          OpinionDraft: {
            taskId: { in: taskIds },
          },
        },
        select: {
          id: true,
          fileName: true,
          fileType: true,
          fileSize: true,
          filePath: true,
          uploadedBy: true,
          createdAt: true,
          category: true,
          OpinionDraft: {
            select: {
              taskId: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 200,
      }),
      prisma.sarsResponse.findMany({
        where: {
          taskId: { in: taskIds },
          documentPath: { not: null },
        },
        select: {
          id: true,
          documentPath: true,
          taskId: true,
          createdBy: true,
          createdAt: true,
          referenceNumber: true,
          subject: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 200,
      }),
    ]);

    // Collect all user IDs
    const userIds = new Set<string>();
    projects.forEach(p => {
      if (p.TaskEngagementLetter?.uploadedBy) userIds.add(p.TaskEngagementLetter.uploadedBy);
    });
    adminDocs.forEach(doc => {
      if (doc.uploadedBy) userIds.add(doc.uploadedBy);
    });
    adjustmentDocs.forEach(doc => {
      if (doc.uploadedBy) userIds.add(doc.uploadedBy);
    });
    opinionDocs.forEach(doc => {
      if (doc.uploadedBy) userIds.add(doc.uploadedBy);
    });
    sarsDocs.forEach(doc => {
      if (doc.createdBy) userIds.add(doc.createdBy);
    });

    // Look up user names
    const users = userIds.size > 0 
      ? await prisma.user.findMany({
          where: { id: { in: Array.from(userIds) } },
          select: { id: true, name: true, email: true },
          take: 100, // Reasonable limit for users
        })
      : [];
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
      if (project.TaskEngagementLetter?.filePath) {
        const pathParts = project.TaskEngagementLetter.filePath.split(/[/\\]/);
        const fileName = pathParts[pathParts.length - 1] || `${project.TaskDesc}-engagement-letter.pdf`;
        documentsByType.engagementLetters.push({
          id: project.id,
          documentType: DocumentType.ENGAGEMENT_LETTER,
          fileName,
          fileType: fileName.split('.').pop() || 'pdf',
          fileSize: 0,
          filePath: project.TaskEngagementLetter.filePath,
          taskId: project.id,
          taskName: project.TaskDesc,
          uploadedBy: project.TaskEngagementLetter.uploadedBy ? userMap.get(project.TaskEngagementLetter.uploadedBy) || project.TaskEngagementLetter.uploadedBy : null,
          createdAt: project.TaskEngagementLetter.uploadedAt || new Date(),
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
      taskId: doc.taskId,
      taskName: taskMap.get(doc.taskId) || 'Unknown Project',
      uploadedBy: doc.uploadedBy ? userMap.get(doc.uploadedBy) || doc.uploadedBy : null,
      createdAt: doc.createdAt,
      category: doc.category,
      description: doc.description ?? undefined,
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
      taskId: doc.taskId,
      taskName: taskMap.get(doc.taskId) || 'Unknown Project',
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
      taskId: doc.OpinionDraft.taskId,
      taskName: taskMap.get(doc.OpinionDraft.taskId) || 'Unknown Project',
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
          taskId: doc.taskId,
          taskName: taskMap.get(doc.taskId) || 'Unknown Project',
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

    const response = NextResponse.json(
      successResponse({
        documents: documentsByType,
        totalCount,
      })
    );

    // Use no-store for user-specific data per workspace rules
    response.headers.set('Cache-Control', 'no-store');
    
    return response;
  },
});
