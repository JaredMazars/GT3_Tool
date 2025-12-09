import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError, AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { CreateTaskSchema } from '@/lib/validation/schemas';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { getTasksWithCounts } from '@/lib/services/tasks/taskService';
import { getServLineCodesBySubGroup } from '@/lib/utils/serviceLineExternal';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { sanitizeObject } from '@/lib/utils/sanitization';
import { getCachedList, setCachedList } from '@/lib/services/cache/listCache';

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    // Users with service line assignments automatically have task read access
    const { checkFeature } = await import('@/lib/permissions/checkFeature');
    const { Feature } = await import('@/lib/permissions/features');
    const { getUserSubServiceLineGroups } = await import('@/lib/services/service-lines/serviceLineService');
    
    const hasPagePermission = await checkFeature(user.id, Feature.ACCESS_TASKS);
    const userSubGroups = await getUserSubServiceLineGroups(user.id);
    const hasServiceLineAccess = userSubGroups.length > 0;
    
    // Grant access if user has either page permission OR service line assignment
    if (!hasPagePermission && !hasServiceLineAccess) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Math.min(Number.parseInt(searchParams.get('limit') || '50'), 100);
    const search = searchParams.get('search') || '';
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const serviceLine = searchParams.get('serviceLine') || undefined;
    const subServiceLineGroup = searchParams.get('subServiceLineGroup') || undefined;
    const internalOnly = searchParams.get('internalOnly') === 'true';
    const clientTasksOnly = searchParams.get('clientTasksOnly') === 'true';
    const myTasksOnly = searchParams.get('myTasksOnly') === 'true';
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    const skip = (page - 1) * limit;

    // Try to get cached data (skip cache for myTasksOnly as it's user-specific)
    const cacheParams = {
      endpoint: 'tasks' as const,
      page,
      limit,
      serviceLine,
      subServiceLineGroup,
      search,
      sortBy,
      sortOrder,
      includeArchived,
      internalOnly,
      clientTasksOnly,
      myTasksOnly,
    };
    
    // Don't cache user-specific queries
    if (!myTasksOnly) {
      const cached = await getCachedList(cacheParams);
      if (cached) {
        return NextResponse.json(successResponse(cached));
      }
    }

    // Build where clause for database-level filtering
    const where: Prisma.TaskWhereInput = {};

    // Filter by team membership if myTasksOnly is true
    // "My Tasks" means tasks where the user is a team member, 
    // even when viewing a specific subServiceLineGroup
    if (myTasksOnly) {
      where.TaskTeam = {
        some: {
          userId: user.id,
        },
      };
    }

    // Filter by archived status (Active field)
    if (!includeArchived) {
      where.Active = 'Yes';
    }

    // Filter for internal projects only (no client assigned)
    if (internalOnly) {
      where.GSClientID = null;
    }

    // Filter for client tasks only (has client assigned)
    if (clientTasksOnly) {
      where.GSClientID = { not: null };
    }

    // Filter by SubServiceLineGroup - show ALL tasks for the specified sub-group
    if (subServiceLineGroup) {
      const servLineCodes = await getServLineCodesBySubGroup(
        subServiceLineGroup,
        serviceLine || undefined
      );
      
      if (servLineCodes.length > 0) {
        where.ServLineCode = { in: servLineCodes };
      } else {
        // No ServLineCodes found, return empty result
        return NextResponse.json(
          successResponse({
            tasks: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
            },
          })
        );
      }
    } else if (serviceLine) {
      // If only serviceLine is provided (no subServiceLineGroup), show ALL tasks for that service line
      const { getExternalServiceLinesByMaster } = await import('@/lib/utils/serviceLineExternal');
      const externalServiceLines = await getExternalServiceLinesByMaster(serviceLine);
      const servLineCodes = externalServiceLines
        .map(sl => sl.ServLineCode)
        .filter((code): code is string => code !== null);
      
      if (servLineCodes.length > 0) {
        where.ServLineCode = { in: servLineCodes };
      }
    }
    // If neither serviceLine nor subServiceLineGroup is provided, show no tasks
    // (this prevents showing all tasks in the system)

    // Add search filter
    if (search) {
      where.OR = [
        { TaskDesc: { contains: search } },
        { TaskCode: { contains: search } },
        { Client: { clientNameFull: { contains: search } } },
        { Client: { clientCode: { contains: search } } },
      ];
    }

    // Build orderBy
    const orderBy: Prisma.TaskOrderByWithRelationInput = {};
    const validSortFields = ['TaskDesc', 'updatedAt', 'createdAt'] as const;
    type ValidSortField = typeof validSortFields[number];
    if (validSortFields.includes(sortBy as ValidSortField)) {
      orderBy[sortBy as ValidSortField] = sortOrder;
    } else {
      orderBy.updatedAt = 'desc';
    }

    // Run count and data queries in parallel for better performance
    // Optimized field selection - only return fields used in the list view
    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          GSClientID: true,
          TaskDesc: true,
          ServLineCode: true,
          ServLineDesc: true,
          Active: true,
          createdAt: true,
          updatedAt: true,
          Client: {
            select: {
              id: true,
              GSClientID: true,
              clientNameFull: true,
              clientCode: true,
            },
          },
          // Only fetch team info if querying for myTasksOnly
          ...(myTasksOnly && {
            TaskTeam: {
              where: {
                userId: user.id,
              },
              select: {
                role: true,
              },
            },
          }),
        },
      }),
    ]);

    // Transform tasks to match expected format
    const tasksWithCounts = tasks.map(task => {
      return {
        id: task.id,
        name: task.TaskDesc,
        description: null,
        projectType: task.ServLineDesc,
        serviceLine: task.ServLineCode,
        status: task.Active === 'Yes' ? 'ACTIVE' : 'INACTIVE',
        archived: task.Active !== 'Yes',
        GSClientID: task.GSClientID,
        taxYear: null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        client: task.Client ? {
          id: task.Client.id,
          GSClientID: task.Client.GSClientID,
          clientNameFull: task.Client.clientNameFull,
          clientCode: task.Client.clientCode,
        } : null,
        userRole: myTasksOnly && 'TaskTeam' in task ? (task.TaskTeam as Array<{role: string}>)[0]?.role || null : null,
        canAccess: true,
      };
    });
    
    const responseData = {
      tasks: tasksWithCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache the response (skip for myTasksOnly)
    if (!myTasksOnly) {
      await setCachedList(cacheParams, responseData);
    }

    return NextResponse.json(successResponse(responseData));
  } catch (error) {
    return handleApiError(error, 'Get Tasks');
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const { checkFeature } = await import('@/lib/permissions/checkFeature');
    const { Feature } = await import('@/lib/permissions/features');
    const hasPermission = await checkFeature(user.id, Feature.MANAGE_TASKS);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions to create tasks' }, { status: 403 });
    }
    
    // Check if user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    
    if (!dbUser) {
      return NextResponse.json({ 
        error: 'User not found in database. Please log out and log back in.' 
      }, { status: 400 });
    }
    
    // Task creation is not yet implemented via this endpoint
    // Tasks are created through BD opportunity conversion or imported from external systems
    return NextResponse.json(
      { error: 'Direct task creation is not yet implemented. Tasks are created through BD opportunity conversion.' },
      { status: 501 }
    );
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return handleApiError(
        new AppError(400, message, ErrorCodes.VALIDATION_ERROR),
        'Create Task'
      );
    }
    
    return handleApiError(error, 'Create Task');
  }
}

