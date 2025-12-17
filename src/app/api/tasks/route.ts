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
    
    // Filter by specific client code
    if (clientCode) {
      where.Client = {
        clientCode: clientCode
      };
    }

    // Filter by status (Active/Inactive)
    if (status) {
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
          TaskPartner: true,
          TaskPartnerName: true,
          TaskManager: true,
          TaskManagerName: true,
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
        taskCode: task.TaskCode,
        description: null,
        projectType: task.ServLineDesc,
        serviceLine: task.ServLineCode,
        status: task.Active === 'Yes' ? 'ACTIVE' : 'INACTIVE',
        archived: task.Active !== 'Yes',
        clientId: task.Client?.id || null,
        GSClientID: task.GSClientID,
        taxYear: null,
        taskPartner: task.TaskPartner,
        taskPartnerName: task.TaskPartnerName,
        taskManager: task.TaskManager,
        taskManagerName: task.TaskManagerName,
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

    // Get service line data from ServLineCode by looking up ServiceLineExternal
    const externalServiceLine = await prisma.serviceLineExternal.findFirst({
      where: {
        ServLineCode: validatedData.ServLineCode,
        ServLineDesc: { not: null },
        SubServlineGroupCode: { not: null },
      },
      select: {
        ServLineDesc: true,
        SubServlineGroupCode: true,
      },
    });

    if (!externalServiceLine) {
      throw new AppError(
        400, 
        `Invalid service line code: ${validatedData.ServLineCode}. Service line not found or has incomplete data.`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const ServLineDesc = externalServiceLine.ServLineDesc!;
    const SLGroup = externalServiceLine.SubServlineGroupCode!;

    // Generate task code if not provided
    let TaskCode = validatedData.TaskCode || '';
    if (!TaskCode) {
      // Generate code: Service line prefix + timestamp suffix
      const prefix = validatedData.ServLineCode.substring(0, 3).toUpperCase();
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
          SLGroup,
          ServLineCode: validatedData.ServLineCode,
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

      // Create TaskTeam entries
      if (validatedData.teamMembers && validatedData.teamMembers.length > 0) {
        // Create team member entries
        for (const member of validatedData.teamMembers) {
          // Find the user by employee code
          const employee = await tx.employee.findFirst({
            where: {
              EmpCode: member.empCode,
              Active: 'Yes',
            },
            select: {
              id: true,
              EmpCode: true,
              WinLogon: true,
            },
          });

          if (employee && employee.WinLogon) {
            // Find user by WinLogon (SQL Server string comparisons are case-insensitive by default)
            const teamUser = await tx.user.findFirst({
              where: {
                email: {
                  endsWith: employee.WinLogon,
                },
              },
              select: { id: true },
            });

            if (teamUser) {
              // Create TaskTeam entry
              await tx.taskTeam.create({
                data: {
                  taskId: task.id,
                  userId: teamUser.id,
                  role: member.role,
                },
              });
            }
          }
        }
      } else {
        // Fallback: If no team members provided, create entry for task creator with ADMIN role
        await tx.taskTeam.create({
          data: {
            taskId: task.id,
            userId: user.id,
            role: 'ADMIN',
          },
        });
      }

      // Create TaskBudget record if budget data provided
      if (
        validatedData.EstChgHours ||
        validatedData.EstFeeTime ||
        validatedData.EstFeeDisb ||
        validatedData.BudStartDate ||
        validatedData.BudDueDate
      ) {
        await tx.taskBudget.create({
          data: {
            TaskBudgetID: crypto.randomUUID(),
            GSTaskID: task.GSTaskID,
            GSClientID: GSClientID,
            ClientCode: task.Client?.clientCode || null,
            TaskCode: task.TaskCode,
            EstChgHours: validatedData.EstChgHours || null,
            EstFeeTime: validatedData.EstFeeTime || null,
            EstFeeDisb: validatedData.EstFeeDisb || null,
            BudStartDate: validatedData.BudStartDate || null,
            BudDueDate: validatedData.BudDueDate || null,
            LastUser: user.email || user.id,
            LastUpdated: new Date(),
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

