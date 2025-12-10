import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { parseTaskId, successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { checkTaskAccess } from '@/lib/services/tasks/taskAuthorization';
import { toTaskId } from '@/types/branded';
import { Prisma } from '@prisma/client';
import { sanitizeText } from '@/lib/utils/sanitization';
import { cache, CACHE_PREFIXES } from '@/lib/services/cache/CacheService';
import { invalidateClientCache } from '@/lib/services/clients/clientCache';
import { invalidateTaskListCache } from '@/lib/services/cache/listCache';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure context and params exist
    if (!context || !context.params) {
      throw new Error('Invalid route context');
    }
    
    const params = await context.params;
    
    // Handle "new" route - this is not a valid task ID
    if (params?.id === 'new') {
      return NextResponse.json(
        { error: 'Invalid route - use POST /api/tasks to create a new task' },
        { status: 404 }
      );
    }
    
    const taskId = toTaskId(parseTaskId(params?.id));

    // Check task access (any role can view)
    const hasAccess = await checkTaskAccess(user.id, taskId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if team members should be included
    const { searchParams } = new URL(request.url);
    const includeTeam = searchParams.get('includeTeam') === 'true';

    // Try to get cached task data (cache key includes user ID for role)
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
        // Always include current user's role, plus all team members if requested
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
          where: {
            userId: user.id,
          },
          select: {
            userId: true,
            role: true,
          },
          take: 1,
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Get service line mapping for URL construction
    let serviceLineMapping = null;
    if (task.ServLineCode) {
      serviceLineMapping = await prisma.serviceLineExternal.findFirst({
        where: { ServLineCode: task.ServLineCode },
        select: {
          SubServlineGroupCode: true,
          masterCode: true,
        },
      });
    }

    // Transform data to match expected format
    const { Client, TaskAcceptance, TaskEngagementLetter, TaskTeam, ...taskData } = task;
    
    // Extract current user's role from team
    const currentUserRole = TaskTeam && Array.isArray(TaskTeam) && TaskTeam.length > 0
      ? TaskTeam.find((member: any) => member.userId === user.id)?.role || null
      : null;
    
    const transformedTask = {
      ...taskData,
      name: task.TaskDesc,
      description: task.TaskDesc,
      client: Client, // Transform Client → client for consistency
      serviceLine: task.ServLineCode,
      projectType: 'TAX_CALCULATION', // Default based on service line
      taxYear: null,
      taxPeriodStart: null,
      taxPeriodEnd: null,
      assessmentYear: null,
      submissionDeadline: null,
      status: task.Active === 'Yes' ? 'ACTIVE' : 'INACTIVE',
      archived: task.Active !== 'Yes',
      // Flatten acceptance data
      acceptanceApproved: TaskAcceptance?.acceptanceApproved || false,
      acceptanceApprovedBy: TaskAcceptance?.approvedBy || null,
      acceptanceApprovedAt: TaskAcceptance?.approvedAt || null,
      // Flatten engagement letter data
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
      currentUserRole, // Include current user's role for permission checks
      currentUserId: user.id, // Include current user ID for easy access
      // Include service line mapping for URL construction
      subServiceLineGroupCode: serviceLineMapping?.SubServlineGroupCode || null,
      masterServiceLine: serviceLineMapping?.masterCode || null,
      ...(includeTeam && { users: TaskTeam }),
    };

    // Cache the response for 5 minutes
    await cache.set(cacheKey, transformedTask, 300);

    return NextResponse.json(successResponse(transformedTask));
  } catch (error) {
    return handleApiError(error, 'Get Task');
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure context and params exist
    if (!context || !context.params) {
      throw new Error('Invalid route context');
    }
    
    const params = await context.params;
    
    // Handle "new" route
    if (params?.id === 'new') {
      return NextResponse.json(
        { error: 'Invalid route - use POST /api/tasks to create a new task' },
        { status: 404 }
      );
    }
    
    const taskId = toTaskId(parseTaskId(params?.id));

    // Check task access (requires EDITOR role or higher)
    const hasAccess = await checkTaskAccess(user.id, taskId, 'EDITOR');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Build update data object
    const updateData: Prisma.TaskUncheckedUpdateInput = {};
    
    if (body.name !== undefined) {
      const sanitizedName = sanitizeText(body.name, { maxLength: 200 });
      if (!sanitizedName) {
        return NextResponse.json(
          { error: 'Task name is required' },
          { status: 400 }
        );
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
    
    // Note: Task model doesn't have these fields, they should be in TaskAcceptance or TaskEngagementLetter
    // For now, we'll just acknowledge them but not update
    
    // Update client association via clientCode or GSClientID
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
          select: {
            MappedAccount: true,
            TaxAdjustment: true,
          },
        },
      },
    });

    // Invalidate cache after update
    await cache.invalidate(`${CACHE_PREFIXES.TASK}detail:${taskId}`);
    await invalidateTaskListCache(Number(taskId));
    
    // Invalidate client cache if client association changed
    if (task.GSClientID) {
      await invalidateClientCache(task.GSClientID);
    }

    // Transform data to match expected format
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
  } catch (error) {
    return handleApiError(error, 'Update Task');
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure context and params exist
    if (!context || !context.params) {
      throw new Error('Invalid route context');
    }
    
    const params = await context.params;
    
    // Handle "new" route
    if (params?.id === 'new') {
      return NextResponse.json(
        { error: 'Invalid route - use POST /api/tasks to create a new task' },
        { status: 404 }
      );
    }
    
    const taskId = toTaskId(params?.id);

    // Check task access (requires ADMIN role)
    const hasAccess = await checkTaskAccess(user.id, taskId, 'ADMIN');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'restore') {
      // Restore archived task to active status
      const task = await prisma.task.update({
        where: { id: taskId },
        data: { Active: 'Yes' },
      });

      // Invalidate cache after restore
      await cache.invalidate(`${CACHE_PREFIXES.TASK}detail:${taskId}`);
      await invalidateTaskListCache(Number(taskId));
      if (task.GSClientID) {
        await invalidateClientCache(task.GSClientID);
      }

      return NextResponse.json(successResponse({ 
        message: 'Task restored successfully',
        task 
      }));
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    return handleApiError(error, 'Process Task Action');
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Ensure context and params exist
    if (!context || !context.params) {
      throw new Error('Invalid route context');
    }
    
    const params = await context.params;
    
    // Handle "new" route
    if (params?.id === 'new') {
      return NextResponse.json(
        { error: 'Invalid route - use POST /api/tasks to create a new task' },
        { status: 404 }
      );
    }
    
    const taskId = toTaskId(params?.id);

    // Check task access (requires ADMIN role)
    const hasAccess = await checkTaskAccess(user.id, taskId, 'ADMIN');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Archive the task instead of deleting
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { Active: 'No' },
    });

    // Invalidate cache after archive
    await cache.invalidate(`${CACHE_PREFIXES.TASK}detail:${taskId}`);
    await invalidateTaskListCache(Number(taskId));
    if (task.GSClientID) {
      await invalidateClientCache(task.GSClientID);
    }

    return NextResponse.json(successResponse({ 
      message: 'Task archived successfully',
      task 
    }));
  } catch (error) {
    return handleApiError(error, 'Archive Task');
  }
} 