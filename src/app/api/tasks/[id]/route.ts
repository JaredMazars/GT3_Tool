import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { parseTaskId, successResponse } from '@/lib/utils/apiUtils';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { toTaskId } from '@/types/branded';
import { Prisma } from '@prisma/client';
import { sanitizeText } from '@/lib/utils/sanitization';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { invalidateClientCache } from '@/lib/services/clients/clientCache';
import { invalidateTaskListCache } from '@/lib/services/cache/listCache';
import { secureRoute } from '@/lib/api/secureRoute';

/**
 * GET /api/tasks/[id]
 * Get task by ID with optional team members
 */
export const GET = secureRoute.queryWithParams({
  handler: async (request, { user, params }) => {
    // Handle "new" route
    if (params?.id === 'new') {
      return NextResponse.json(
        { success: false, error: 'Invalid route - use POST /api/tasks to create a new task' },
        { status: 404 }
      );
    }
    
    const taskId = toTaskId(parseTaskId(params?.id));

    // Check task access (any role can view)
    const hasAccess = await checkTaskAccess(user.id, taskId);
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Check if team members should be included
    const { searchParams } = new URL(request.url);
    const includeTeam = searchParams.get('includeTeam') === 'true';

    // Try to get cached task data
    const cacheKey = `${CACHE_PREFIXES.TASK}detail:${taskId}:${includeTeam}:user:${user.id}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

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
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    // Get service line mapping for URL construction
    let serviceLineMapping = null;
    if (task.ServLineCode) {
      serviceLineMapping = await prisma.serviceLineExternal.findFirst({
        where: { ServLineCode: task.ServLineCode },
        select: { SubServlineGroupCode: true, masterCode: true },
      });
    }

    // Transform data to match expected format
    const { Client, TaskAcceptance, TaskEngagementLetter, TaskTeam, ...taskData } = task;
    
    const currentUserRole = TaskTeam && Array.isArray(TaskTeam) && TaskTeam.length > 0
      ? TaskTeam.find((member: { userId: string }) => member.userId === user.id)?.role || null
      : null;
    
    const transformedTask = {
      ...taskData,
      name: task.TaskDesc,
      description: task.TaskDesc,
      client: Client,
      serviceLine: task.ServLineCode,
      projectType: 'TAX_CALCULATION',
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
      _count: {
        mappings: task._count.MappedAccount,
        taxAdjustments: task._count.TaxAdjustment,
      },
      currentUserRole,
      currentUserId: user.id,
      subServiceLineGroupCode: serviceLineMapping?.SubServlineGroupCode || null,
      masterServiceLine: serviceLineMapping?.masterCode || null,
      ...(includeTeam && { users: TaskTeam }),
    };

    // Cache the response for 5 minutes
    await cache.set(cacheKey, transformedTask, 300);

    return NextResponse.json(successResponse(transformedTask));
  },
});

/**
 * PUT /api/tasks/[id]
 * Update a task
 */
export const PUT = secureRoute.mutationWithParams({
  handler: async (request, { user, params }) => {
    if (params?.id === 'new') {
      return NextResponse.json(
        { success: false, error: 'Invalid route - use POST /api/tasks to create a new task' },
        { status: 404 }
      );
    }
    
    const taskId = toTaskId(parseTaskId(params?.id));

    // Check task access (requires EDITOR role or higher)
    const hasAccess = await checkTaskAccess(user.id, taskId, 'EDITOR');
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Build update data object
    const updateData: Prisma.TaskUncheckedUpdateInput = {};
    
    if (body.name !== undefined) {
      const sanitizedName = sanitizeText(body.name, { maxLength: 200 });
      if (!sanitizedName) {
        return NextResponse.json({ success: false, error: 'Task name is required' }, { status: 400 });
      }
      updateData.TaskDesc = sanitizedName;
    }
    
    if (body.description !== undefined) {
      const sanitizedDesc = sanitizeText(body.description, { 
        maxLength: 1000,
        allowHTML: false,
        allowNewlines: true 
      });
      if (sanitizedDesc !== null) {
        updateData.TaskDesc = sanitizedDesc;
      }
    }
    
    if (body.clientCode !== undefined) {
      if (body.clientCode !== null) {
        const client = await prisma.client.findUnique({
          where: { clientCode: body.clientCode },
          select: { GSClientID: true },
        });
        if (client) {
          updateData.GSClientID = client.GSClientID;
        }
      } else {
        updateData.GSClientID = null;
      }
    } else if (body.GSClientID !== undefined) {
      updateData.GSClientID = body.GSClientID;
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        Client: true,
        TaskAcceptance: true,
        TaskEngagementLetter: true,
        _count: {
          select: { MappedAccount: true, TaxAdjustment: true },
        },
      },
    });

    // Invalidate cache after update
    await cache.invalidate(`${CACHE_PREFIXES.TASK}detail:${taskId}`);
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
      projectType: 'TAX_CALCULATION',
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
  handler: async (request, { user, params }) => {
    if (params?.id === 'new') {
      return NextResponse.json(
        { success: false, error: 'Invalid route - use POST /api/tasks to create a new task' },
        { status: 404 }
      );
    }
    
    const taskId = toTaskId(params?.id);

    // Check task access (requires ADMIN role)
    const hasAccess = await checkTaskAccess(user.id, taskId, 'ADMIN');
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'restore') {
      const task = await prisma.task.update({
        where: { id: taskId },
        data: { Active: 'Yes' },
      });

      await cache.invalidate(`${CACHE_PREFIXES.TASK}detail:${taskId}`);
      await invalidateTaskListCache(Number(taskId));
      if (task.GSClientID) {
        await invalidateClientCache(task.GSClientID);
      }

      return NextResponse.json(successResponse({ message: 'Task restored successfully', task }));
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  },
});

/**
 * DELETE /api/tasks/[id]
 * Archive a task
 */
export const DELETE = secureRoute.mutationWithParams({
  handler: async (request, { user, params }) => {
    if (params?.id === 'new') {
      return NextResponse.json(
        { success: false, error: 'Invalid route - use POST /api/tasks to create a new task' },
        { status: 404 }
      );
    }
    
    const taskId = toTaskId(params?.id);

    // Check task access (requires ADMIN role)
    const hasAccess = await checkTaskAccess(user.id, taskId, 'ADMIN');
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Archive the task instead of deleting
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { Active: 'No' },
    });

    await cache.invalidate(`${CACHE_PREFIXES.TASK}detail:${taskId}`);
    await invalidateTaskListCache(Number(taskId));
    if (task.GSClientID) {
      await invalidateClientCache(task.GSClientID);
    }

    return NextResponse.json(successResponse({ message: 'Task archived successfully', task }));
  },
});
