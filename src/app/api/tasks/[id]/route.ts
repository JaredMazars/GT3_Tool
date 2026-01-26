import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { parseTaskId, successResponse } from '@/lib/utils/apiUtils';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { toTaskId } from '@/types/branded';
import { Prisma } from '@prisma/client';
import { invalidateClientCache } from '@/lib/services/cache/cacheInvalidation';
import { invalidateTaskListCache } from '@/lib/services/cache/listCache';
import { secureRoute } from '@/lib/api/secureRoute';
import { AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { enrichRecordsWithEmployeeNames } from '@/lib/services/employees/employeeQueries';
import { enrichEmployeesWithStatus } from '@/lib/services/employees/employeeStatusService';
import { z } from 'zod';

// Zod schema for PUT request body
const UpdateTaskSchema = z.object({
  name: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  clientCode: z.string().max(50).nullable().optional(),
  GSClientID: z.string().uuid().nullable().optional(),
}).strict();

// Zod schema for PATCH request body
const TaskActionSchema = z.object({
  action: z.enum(['restore']),
}).strict();

/**
 * GET /api/tasks/[id]
 * Get task by ID with optional team members
 */
export const GET = secureRoute.queryWithParams({
  handler: async (request, { user, params }) => {
    // Handle "new" route
    if (params?.id === 'new') {
      throw new AppError(404, 'Invalid route - use POST /api/tasks to create a new task', ErrorCodes.NOT_FOUND);
    }
    
    const taskId = toTaskId(parseTaskId(params?.id));

    // Check task access (any role can view)
    const hasAccess = await checkTaskAccess(user.id, taskId);
    if (!hasAccess) {
      throw new AppError(403, 'Forbidden', ErrorCodes.FORBIDDEN);
    }

    // Check if team members should be included
    const { searchParams } = new URL(request.url);
    const includeTeam = searchParams.get('includeTeam') === 'true';

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        GSClientID: true,
        TaskDesc: true,
        TaskCode: true,
        ServLineCode: true,
        ServLineDesc: true,
        TaskPartner: true,
        TaskPartnerName: true,
        TaskManager: true,
        TaskManagerName: true,
        OfficeCode: true,
        SLGroup: true,
        Active: true,
        TaskDateOpen: true,
        TaskDateTerminate: true,
        Client: {
          select: {
            id: true,
            GSClientID: true,
            clientCode: true,
            clientNameFull: true,
            clientPartner: true,
            clientManager: true,
            forvisMazarsIndustry: true,
            forvisMazarsSector: true,
            industry: true,
            sector: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        TaskAcceptance: {
          select: {
            acceptanceApproved: true,
            approvedBy: true,
            approvedAt: true,
            questionnaireType: true,
            overallRiskScore: true,
            riskRating: true,
          },
        },
        TaskEngagementLetter: {
          select: {
            generated: true,
            uploaded: true,
            filePath: true,
            content: true,
            templateId: true,
            generatedAt: true,
            generatedBy: true,
            uploadedAt: true,
            uploadedBy: true,
            // Engagement Letter extraction metadata
            elExtractionStatus: true,
            elLetterDate: true,
            elLetterAge: true,
            elSigningPartner: true,
            elSigningPartnerCode: true,
            elServicesCovered: true,
            elHasPartnerSignature: true,
            elHasClientSignature: true,
            elHasTermsConditions: true,
            elHasTcPartnerSignature: true,
            elHasTcClientSignature: true,
            // DPA fields
            dpaUploaded: true,
            dpaFilePath: true,
            dpaUploadedAt: true,
            dpaUploadedBy: true,
            // DPA extraction metadata
            dpaExtractionStatus: true,
            dpaLetterDate: true,
            dpaLetterAge: true,
            dpaSigningPartner: true,
            dpaSigningPartnerCode: true,
            dpaHasPartnerSignature: true,
            dpaHasClientSignature: true,
          },
        },
        _count: {
          select: {
            MappedAccount: true,
            TaxAdjustment: true,
          },
        },
        TaskTeam: includeTeam ? {
          select: {
            id: true,
            userId: true,
            role: true,
            createdAt: true,
            User: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        } : {
          where: { userId: user.id },
          select: { userId: true, role: true },
          take: 1,
        },
      },
    });

    if (!task) {
      throw new AppError(404, 'Task not found', ErrorCodes.NOT_FOUND);
    }

    // Enrich task with current employee names for partner/manager
    const [enrichedTask] = await enrichRecordsWithEmployeeNames([task], [
      { codeField: 'TaskPartner', nameField: 'TaskPartnerName' },
      { codeField: 'TaskManager', nameField: 'TaskManagerName' },
    ]);

    if (!enrichedTask) {
      throw new AppError(404, 'Task not found', ErrorCodes.NOT_FOUND);
    }

    // Fetch employee status for partner and manager
    const employeeCodes = [
      enrichedTask.TaskPartner,
      enrichedTask.TaskManager
    ].filter(Boolean) as string[];

    const employeeStatusMap = await enrichEmployeesWithStatus(employeeCodes);

    // Get service line mapping for URL construction
    let serviceLineMapping = null;
    if (enrichedTask.ServLineCode) {
      serviceLineMapping = await prisma.serviceLineExternal.findFirst({
        where: { ServLineCode: enrichedTask.ServLineCode },
        select: { SubServlineGroupCode: true, masterCode: true },
      });
    }

    // Transform data to match expected format
    const { Client, TaskAcceptance, TaskEngagementLetter, TaskTeam, ...taskData } = enrichedTask;
    
    const currentUserRole = TaskTeam && Array.isArray(TaskTeam) && TaskTeam.length > 0
      ? TaskTeam.find((member: { userId: string }) => member.userId === user.id)?.role || null
      : null;
    
    const transformedTask = {
      ...taskData,
      TaskPartnerStatus: enrichedTask.TaskPartner ? employeeStatusMap.get(enrichedTask.TaskPartner) : undefined,
      TaskManagerStatus: enrichedTask.TaskManager ? employeeStatusMap.get(enrichedTask.TaskManager) : undefined,
      name: enrichedTask.TaskDesc,
      description: enrichedTask.TaskDesc,
      client: Client,
      serviceLine: enrichedTask.ServLineCode,
      taxYear: null,
      taxPeriodStart: null,
      taxPeriodEnd: null,
      assessmentYear: null,
      submissionDeadline: null,
      status: enrichedTask.Active === 'Yes' ? 'ACTIVE' : 'INACTIVE',
      archived: enrichedTask.Active !== 'Yes',
      acceptanceApproved: TaskAcceptance?.acceptanceApproved || false,
      acceptanceApprovedBy: TaskAcceptance?.approvedBy || null,
      acceptanceApprovedAt: TaskAcceptance?.approvedAt || null,
      engagementLetterGenerated: TaskEngagementLetter?.generated || false,
      engagementLetterContent: TaskEngagementLetter?.content || null,
      engagementLetterTemplateId: TaskEngagementLetter?.templateId || null,
      engagementLetterGeneratedBy: TaskEngagementLetter?.generatedBy || null,
      engagementLetterGeneratedAt: TaskEngagementLetter?.generatedAt || null,
      engagementLetterUploaded: TaskEngagementLetter?.uploaded || false,
      engagementLetterPath: TaskEngagementLetter?.filePath || null,
      engagementLetterUploadedBy: TaskEngagementLetter?.uploadedBy || null,
      engagementLetterUploadedAt: TaskEngagementLetter?.uploadedAt || null,
      // Engagement Letter extraction metadata
      elExtractionStatus: TaskEngagementLetter?.elExtractionStatus || null,
      elLetterDate: TaskEngagementLetter?.elLetterDate || null,
      elLetterAge: TaskEngagementLetter?.elLetterAge || null,
      elSigningPartner: TaskEngagementLetter?.elSigningPartner || null,
      elSigningPartnerCode: TaskEngagementLetter?.elSigningPartnerCode || null,
      elServicesCovered: TaskEngagementLetter?.elServicesCovered || null,
      elHasPartnerSignature: TaskEngagementLetter?.elHasPartnerSignature || null,
      elHasClientSignature: TaskEngagementLetter?.elHasClientSignature || null,
      elHasTermsConditions: TaskEngagementLetter?.elHasTermsConditions || null,
      elHasTcPartnerSignature: TaskEngagementLetter?.elHasTcPartnerSignature || null,
      elHasTcClientSignature: TaskEngagementLetter?.elHasTcClientSignature || null,
      // DPA fields
      dpaUploaded: TaskEngagementLetter?.dpaUploaded || false,
      dpaPath: TaskEngagementLetter?.dpaFilePath || null,
      dpaUploadedBy: TaskEngagementLetter?.dpaUploadedBy || null,
      dpaUploadedAt: TaskEngagementLetter?.dpaUploadedAt || null,
      // DPA extraction metadata
      dpaExtractionStatus: TaskEngagementLetter?.dpaExtractionStatus || null,
      dpaLetterDate: TaskEngagementLetter?.dpaLetterDate || null,
      dpaLetterAge: TaskEngagementLetter?.dpaLetterAge || null,
      dpaSigningPartner: TaskEngagementLetter?.dpaSigningPartner || null,
      dpaSigningPartnerCode: TaskEngagementLetter?.dpaSigningPartnerCode || null,
      dpaHasPartnerSignature: TaskEngagementLetter?.dpaHasPartnerSignature || null,
      dpaHasClientSignature: TaskEngagementLetter?.dpaHasClientSignature || null,
      _count: {
        mappings: enrichedTask._count.MappedAccount,
        taxAdjustments: enrichedTask._count.TaxAdjustment,
      },
      currentUserRole,
      currentUserId: user.id,
      subServiceLineGroupCode: serviceLineMapping?.SubServlineGroupCode || null,
      masterServiceLine: serviceLineMapping?.masterCode || null,
      ...(includeTeam && { users: TaskTeam }),
    };

    return NextResponse.json(successResponse(transformedTask));
  },
});

/**
 * PUT /api/tasks/[id]
 * Update a task
 */
export const PUT = secureRoute.mutationWithParams({
  schema: UpdateTaskSchema,
  handler: async (request, { user, params, data }) => {
    if (params?.id === 'new') {
      throw new AppError(404, 'Invalid route - use POST /api/tasks to create a new task', ErrorCodes.NOT_FOUND);
    }
    
    const taskId = toTaskId(parseTaskId(params?.id));

    // Check task access (requires EDITOR role or higher)
    const hasAccess = await checkTaskAccess(user.id, taskId, 'EDITOR');
    if (!hasAccess) {
      throw new AppError(403, 'Forbidden', ErrorCodes.FORBIDDEN);
    }

    // Build update data object with explicit field mapping
    const updateData: Prisma.TaskUncheckedUpdateInput = {};
    
    if (data.name !== undefined) {
      if (!data.name) {
        throw new AppError(400, 'Task name is required', ErrorCodes.VALIDATION_ERROR);
      }
      updateData.TaskDesc = data.name;
    }
    
    if (data.description !== undefined) {
      if (data.description !== null) {
        updateData.TaskDesc = data.description;
      }
    }
    
    if (data.clientCode !== undefined) {
      if (data.clientCode !== null) {
        const client = await prisma.client.findUnique({
          where: { clientCode: data.clientCode },
          select: { GSClientID: true },
        });
        if (client) {
          updateData.GSClientID = client.GSClientID;
        }
      } else {
        updateData.GSClientID = null;
      }
    } else if (data.GSClientID !== undefined) {
      updateData.GSClientID = data.GSClientID;
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      select: {
        id: true,
        GSClientID: true,
        TaskDesc: true,
        TaskCode: true,
        ServLineCode: true,
        ServLineDesc: true,
        TaskPartner: true,
        TaskPartnerName: true,
        TaskManager: true,
        TaskManagerName: true,
        OfficeCode: true,
        SLGroup: true,
        Active: true,
        TaskDateOpen: true,
        TaskDateTerminate: true,
        createdAt: true,
        updatedAt: true,
        Client: {
          select: {
            id: true,
            GSClientID: true,
            clientCode: true,
            clientNameFull: true,
          },
        },
        TaskAcceptance: {
          select: {
            acceptanceApproved: true,
            approvedBy: true,
            approvedAt: true,
          },
        },
        TaskEngagementLetter: {
          select: {
            generated: true,
            uploaded: true,
            filePath: true,
            content: true,
            templateId: true,
            generatedAt: true,
            generatedBy: true,
            uploadedAt: true,
            uploadedBy: true,
            dpaUploaded: true,
            dpaFilePath: true,
            dpaUploadedAt: true,
            dpaUploadedBy: true,
          },
        },
        _count: {
          select: { MappedAccount: true, TaxAdjustment: true },
        },
      },
    });

    // Invalidate list cache after update
    await invalidateTaskListCache(Number(taskId));
    
    if (task.GSClientID) {
      await invalidateClientCache(task.GSClientID);
    }

    // Transform data
    const { Client, TaskAcceptance, TaskEngagementLetter, ...taskData } = task;
    const transformedTask = {
      ...taskData,
      name: task.TaskDesc,
      description: task.TaskDesc,
      client: Client,
      serviceLine: task.ServLineCode,
      taxYear: null,
      taxPeriodStart: null,
      taxPeriodEnd: null,
      assessmentYear: null,
      submissionDeadline: null,
      status: task.Active === 'Yes' ? 'ACTIVE' : 'INACTIVE',
      archived: task.Active !== 'Yes',
      acceptanceApproved: TaskAcceptance?.acceptanceApproved || false,
      acceptanceApprovedBy: TaskAcceptance?.approvedBy || null,
      acceptanceApprovedAt: TaskAcceptance?.approvedAt || null,
      engagementLetterGenerated: TaskEngagementLetter?.generated || false,
      engagementLetterContent: TaskEngagementLetter?.content || null,
      engagementLetterTemplateId: TaskEngagementLetter?.templateId || null,
      engagementLetterGeneratedBy: TaskEngagementLetter?.generatedBy || null,
      engagementLetterGeneratedAt: TaskEngagementLetter?.generatedAt || null,
      engagementLetterUploaded: TaskEngagementLetter?.uploaded || false,
      engagementLetterPath: TaskEngagementLetter?.filePath || null,
      engagementLetterUploadedBy: TaskEngagementLetter?.uploadedBy || null,
      engagementLetterUploadedAt: TaskEngagementLetter?.uploadedAt || null,
      dpaUploaded: TaskEngagementLetter?.dpaUploaded || false,
      dpaPath: TaskEngagementLetter?.dpaFilePath || null,
      dpaUploadedBy: TaskEngagementLetter?.dpaUploadedBy || null,
      dpaUploadedAt: TaskEngagementLetter?.dpaUploadedAt || null,
      _count: task._count ? {
        mappings: task._count.MappedAccount,
        taxAdjustments: task._count.TaxAdjustment,
      } : undefined,
    };

    return NextResponse.json(successResponse(transformedTask));
  },
});

/**
 * PATCH /api/tasks/[id]
 * Process task actions (e.g., restore archived task)
 */
export const PATCH = secureRoute.mutationWithParams({
  schema: TaskActionSchema,
  handler: async (request, { user, params, data }) => {
    if (params?.id === 'new') {
      throw new AppError(404, 'Invalid route - use POST /api/tasks to create a new task', ErrorCodes.NOT_FOUND);
    }
    
    const taskId = toTaskId(parseTaskId(params?.id));

    // Check task access (requires ADMIN role)
    const hasAccess = await checkTaskAccess(user.id, taskId, 'ADMIN');
    if (!hasAccess) {
      throw new AppError(403, 'Forbidden', ErrorCodes.FORBIDDEN);
    }

    if (data.action === 'restore') {
      const task = await prisma.task.update({
        where: { id: taskId },
        data: { Active: 'Yes' },
        select: {
          id: true,
          TaskDesc: true,
          TaskCode: true,
          Active: true,
          GSClientID: true,
        },
      });

      await invalidateTaskListCache(Number(taskId));
      if (task.GSClientID) {
        await invalidateClientCache(task.GSClientID);
      }

      return NextResponse.json(successResponse({ message: 'Task restored successfully', task }));
    }

    // This should never be reached due to Zod validation, but kept for safety
    throw new AppError(400, 'Invalid action', ErrorCodes.VALIDATION_ERROR);
  },
});

/**
 * DELETE /api/tasks/[id]
 * Archive a task
 */
export const DELETE = secureRoute.mutationWithParams({
  handler: async (request, { user, params }) => {
    if (params?.id === 'new') {
      throw new AppError(404, 'Invalid route - use POST /api/tasks to create a new task', ErrorCodes.NOT_FOUND);
    }
    
    const taskId = toTaskId(parseTaskId(params?.id));

    // Check task access (requires ADMIN role)
    const hasAccess = await checkTaskAccess(user.id, taskId, 'ADMIN');
    if (!hasAccess) {
      throw new AppError(403, 'Forbidden', ErrorCodes.FORBIDDEN);
    }

    // Archive the task instead of deleting
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { Active: 'No' },
      select: {
        id: true,
        TaskDesc: true,
        TaskCode: true,
        Active: true,
        GSClientID: true,
      },
    });

    await invalidateTaskListCache(Number(taskId));
    if (task.GSClientID) {
      await invalidateClientCache(task.GSClientID);
    }

    return NextResponse.json(successResponse({ message: 'Task archived successfully', task }));
  },
});
