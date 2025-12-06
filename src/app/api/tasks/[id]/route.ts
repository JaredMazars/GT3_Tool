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

    // Try to get cached task data
    const cacheKey = `${CACHE_PREFIXES.TASK}detail:${taskId}:${includeTeam}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        TaskDesc: true,
        ClientCode: true,
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
            ClientID: true,
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
        // Only include team members if requested
        ...(includeTeam && {
          TaskTeam: {
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
          },
        }),
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Transform data to match expected format
    const { Client, TaskAcceptance, TaskEngagementLetter, ...taskData } = task;
    const transformedTask = {
      ...taskData,
      name: task.TaskDesc,
      description: task.TaskDesc,
      clientId: Client?.id || null,
      ClientCode: task.ClientCode,
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
      ...(includeTeam && { users: task.TaskTeam }),
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
    
    if (body.clientId !== undefined) {
      // Need to get ClientID from the client numeric id
      if (body.clientId !== null) {
        const client = await prisma.client.findUnique({
          where: { id: body.clientId },
          select: { ClientID: true },
        });
        if (client) {
          updateData.ClientCode = client.ClientID;
        }
      } else {
        // Setting to null removes client association
        updateData.ClientCode = null;
      }
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
    
    // Invalidate client cache if client association changed
    if (task.ClientCode) {
      await invalidateClientCache(task.ClientCode);
    }

    // Transform data to match expected format
    const { Client, TaskAcceptance, TaskEngagementLetter, ...taskData } = task;
    const transformedTask = {
      ...taskData,
      name: task.TaskDesc,
      description: task.TaskDesc,
      clientId: Client?.id || null,
      ClientCode: task.ClientCode,
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
      if (task.ClientCode) {
        await invalidateClientCache(task.ClientCode);
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
    if (task.ClientCode) {
      await invalidateClientCache(task.ClientCode);
    }

    return NextResponse.json(successResponse({ 
      message: 'Task archived successfully',
      task 
    }));
  } catch (error) {
    return handleApiError(error, 'Archive Task');
  }
} 