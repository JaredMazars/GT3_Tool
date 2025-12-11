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
import { getCachedList, setCachedList, invalidateTaskListCache } from '@/lib/services/cache/listCache';

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
    const clientCode = searchParams.get('clientCode') || undefined;
    const status = searchParams.get('status') || undefined;
    
    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:37',message:'Query params parsed',data:{clientCode,status,serviceLine,subServiceLineGroup,includeArchived,search},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

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
      clientCode,
      status,
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

    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:146',message:'Before clientCode check',data:{clientCode,hasClientCode:!!clientCode,clientCodeType:typeof clientCode,clientCodeLength:clientCode?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    // Filter by specific client code
    if (clientCode) {
      // #region agent log
      await fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:153',message:'Applying clientCode filter',data:{clientCode,serviceLine,subServiceLineGroup,status},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      where.Client = {
        clientCode: clientCode
      };
    }

    // Filter by status (Active/Inactive)
    if (status) {
      // #region agent log
      await fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:155',message:'Applying status filter',data:{status,mappedValue:status==='Active'?'Yes':'No'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      if (status === 'Active') {
        where.Active = 'Yes';
      } else if (status === 'Inactive') {
        where.Active = 'No';
      }
    }

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
          TaskCode: true,
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

    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/b3aab070-f6ba-47bb-8f83-44bc48c48d0b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:236',message:'Tasks fetched from DB',data:{totalCount:tasks.length,totalFromCount:total,clientCode,status,whereCondition:JSON.stringify(where),sampleTasks:tasks.slice(0,5).map(t=>({id:t.id,TaskCode:t.TaskCode,name:t.TaskDesc,clientCode:t.Client?.clientCode,active:t.Active}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,C,D'})}).catch(()=>{});
    // #endregion
    
    // Transform tasks to match expected format
    const tasksWithCounts = tasks.map(task => {
      return {
        id: task.id,
        name: task.TaskDesc,
        TaskCode: task.TaskCode,
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

    // Parse and validate request body
    const body = await request.json();
    const sanitizedData = sanitizeObject(body);
    const validatedData = CreateTaskSchema.parse(sanitizedData);

    // Get client data if provided
    let GSClientID: string | null = null;
    if (validatedData.GSClientID) {
      GSClientID = validatedData.GSClientID;
    } else if (body.clientId) {
      // Lookup client by internal ID to get GSClientID
      const client = await prisma.client.findUnique({
        where: { id: Number(body.clientId) },
        select: { GSClientID: true },
      });
      if (client) {
        GSClientID = client.GSClientID;
      }
    }

    // Get service line external mapping to get ServLineCode and ServLineDesc
    const { getExternalServiceLinesBySubGroup } = await import('@/lib/utils/serviceLineExternal');
    const externalServiceLines = await getExternalServiceLinesBySubGroup(validatedData.SLGroup);
    
    if (!externalServiceLines || externalServiceLines.length === 0) {
      throw new AppError(400, 'Invalid service line sub-group', ErrorCodes.VALIDATION_ERROR);
    }

    const externalSL = externalServiceLines[0];
    if (!externalSL) {
      throw new AppError(400, 'Invalid service line configuration', ErrorCodes.VALIDATION_ERROR);
    }
    
    const ServLineCode = externalSL.ServLineCode || validatedData.SLGroup;
    const ServLineDesc = externalSL.ServLineDesc || validatedData.SLGroup;

    // Generate task code if not provided
    let TaskCode = validatedData.TaskCode || '';
    if (!TaskCode) {
      // Generate code: Service line prefix + timestamp suffix
      const prefix = ServLineCode.substring(0, 3).toUpperCase();
      const suffix = Date.now().toString().slice(-5);
      TaskCode = `${prefix}${suffix}`;
    }

    // Use database transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // Create the task
      const task = await tx.task.create({
        data: {
          GSTaskID: crypto.randomUUID(),
          TaskCode,
          TaskDesc: validatedData.TaskDesc,
          taskYear: validatedData.taskYear,
          GSClientID,
          TaskPartner: validatedData.TaskPartner,
          TaskPartnerName: validatedData.TaskPartnerName,
          TaskManager: validatedData.TaskManager,
          TaskManagerName: validatedData.TaskManagerName,
          OfficeCode: validatedData.OfficeCode,
          SLGroup: validatedData.SLGroup,
          ServLineCode,
          ServLineDesc,
          Active: 'Yes',
          TaskDateOpen: validatedData.TaskDateOpen,
          TaskDateTerminate: validatedData.TaskDateTerminate || null,
          createdBy: user.id,
        },
        select: {
          id: true,
          GSTaskID: true,
          TaskCode: true,
          TaskDesc: true,
          ServLineCode: true,
          ServLineDesc: true,
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
        },
      });

      // Create TaskTeam entry for creator with ADMIN role
      await tx.taskTeam.create({
        data: {
          taskId: task.id,
          userId: user.id,
          role: 'ADMIN',
        },
      });

      // Create initial WIP record with estimates if provided
      if (
        validatedData.estimatedHours ||
        validatedData.estimatedTimeValue ||
        validatedData.estimatedDisbursements ||
        validatedData.estimatedAdjustments
      ) {
        await tx.wip.create({
          data: {
            GSWipID: crypto.randomUUID(),
            GSTaskID: task.GSTaskID,
            GSClientID: GSClientID || '',
            ClientCode: task.Client?.clientCode || '',
            TaskCode: task.TaskCode,
            OfficeCode: validatedData.OfficeCode,
            ServLineCode,
            TaskPartner: validatedData.TaskPartner,
            // Set estimated values as LTD (Life-To-Date) fields
            LTDHours: validatedData.estimatedHours || 0,
            LTDFeeTime: validatedData.estimatedTimeValue || 0,
            LTDFeeDisb: validatedData.estimatedDisbursements || 0,
            LTDAdjTime: validatedData.estimatedAdjustments || 0,
            // Initialize all other fields to 0
            LTDTime: 0,
            LTDDisb: 0,
            LTDAdjDisb: 0,
            LTDCost: 0,
            YTDTime: 0,
            YTDDisb: 0,
            YTDFeeTime: 0,
            YTDFeeDisb: 0,
            YTDAdjTime: 0,
            YTDAdjDisb: 0,
            YTDCost: 0,
            PTDTime: 0,
            PTDDisb: 0,
            PTDFeeTime: 0,
            PTDFeeDisb: 0,
            PTDAdjTime: 0,
            PTDAdjDisb: 0,
            PTDCost: 0,
            BalTime: validatedData.estimatedTimeValue || 0,
            BalDisb: validatedData.estimatedDisbursements || 0,
            BalWIP: (validatedData.estimatedTimeValue || 0) + (validatedData.estimatedDisbursements || 0),
            WipProvision: 0,
            PTDProvision: 0,
            YTDProvision: 0,
            PTDPendingTime: 0,
            YTDPendingTime: 0,
            LTDPendingTime: 0,
            PTDCostExcludeCP: 0,
            YTDCostExcludeCP: 0,
            LTDCostExcludeCP: 0,
            YTDHours: 0,
            PTDHours: 0,
          },
        });
      }

      return task;
    });

    // Invalidate task list cache
    await invalidateTaskListCache();

    // Return created task
    return NextResponse.json(
      successResponse({
        id: result.id,
        name: result.TaskDesc,
        taskCode: result.TaskCode,
        serviceLine: result.ServLineCode,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
        client: result.Client,
      })
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

