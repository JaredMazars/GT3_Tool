import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { getCachedList, setCachedList } from '@/lib/services/cache/listCache';
import { getUserServiceLines } from '@/lib/services/service-lines/serviceLineService';
import { getExternalServiceLinesByMaster } from '@/lib/utils/serviceLineExternal';

export async function GET(
  request: NextRequest,
  { params }: { params: { groupCode: string } }
) {
  try {
    // 1. Authenticate
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check Permission
    const { checkUserPermission } = await import('@/lib/services/permissions/permissionService');
    const hasPermission = await checkUserPermission(user.id, 'clients', 'READ');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }

    // 3. Get user's accessible service lines
    const userServiceLines = await getUserServiceLines(user.id);
    const accessibleMasterCodes = userServiceLines.map(sl => sl.serviceLine);

    // Map master codes to actual ServLineCodes from ServiceLineExternal
    const servLineCodesPromises = accessibleMasterCodes.map(masterCode =>
      getExternalServiceLinesByMaster(masterCode)
    );
    const servLineCodesArrays = await Promise.all(servLineCodesPromises);
    
    // Flatten and extract ServLineCodes
    const accessibleServLineCodes = Array.from(
      new Set(
        servLineCodesArrays
          .flat()
          .map(sl => sl.ServLineCode)
          .filter((code): code is string => code !== null)
      )
    );

    // If user has no accessible ServLineCodes, return empty
    if (accessibleServLineCodes.length === 0) {
      return NextResponse.json(
        successResponse({
          groupCode: params.groupCode,
          groupDesc: '',
          clients: [],
          tasks: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
          },
        })
      );
    }

    const { groupCode } = params;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Math.min(Number.parseInt(searchParams.get('limit') || '50'), 100);
    const dataType = searchParams.get('type') || 'clients'; // 'clients' or 'tasks'
    const serviceLine = searchParams.get('serviceLine') || undefined; // Filter by master service line
    const skip = (page - 1) * limit;

    // Try to get cached data
    const cacheParams = {
      endpoint: 'groups' as const,
      page,
      limit,
      search,
      groupCode,
      type: dataType as 'clients' | 'tasks',
      serviceLine,
    };
    
    const cached = await getCachedList(cacheParams);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }

    // First, verify the group exists and get its description
    const groupInfo = await prisma.client.findFirst({
      where: { groupCode },
      select: {
        groupCode: true,
        groupDesc: true,
      },
    });

    if (!groupInfo) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    if (dataType === 'tasks') {
      // Fetch tasks for all clients in this group
      interface TaskWhereClause {
        Client: {
          groupCode: string;
        };
        ServLineCode: {
          in: string[];
        };
        OR?: Array<Record<string, { contains: string }>>;
        ServiceLineExternal?: {
          masterCode?: string;
        };
      }

      const taskWhere: TaskWhereClause = {
        Client: {
          groupCode,
        },
        ServLineCode: {
          in: accessibleServLineCodes, // Security filter
        },
      };

      // Filter by master service line if provided
      if (serviceLine) {
        taskWhere.ServiceLineExternal = {
          masterCode: serviceLine,
        };
      }

      if (search) {
        taskWhere.OR = [
          { TaskDesc: { contains: search } },
          { TaskCode: { contains: search } },
        ];
      }

      // Execute count and data queries in parallel for better performance
      const [total, tasksRaw] = await Promise.all([
        prisma.task.count({ where: taskWhere }),
        prisma.task.findMany({
          where: taskWhere,
          skip,
          take: limit,
          orderBy: {
            updatedAt: 'desc',
          },
          select: {
            id: true,
            TaskDesc: true,
            TaskCode: true,
            Active: true,
            ServLineCode: true,
            ServLineDesc: true,
            SLGroup: true,
            createdAt: true,
            updatedAt: true,
            Client: {
              select: {
                ClientID: true,
                clientCode: true,
                clientNameFull: true,
              },
            },
            ServiceLineExternal: {
              select: {
                masterCode: true,
                ServiceLineMaster: {
                  select: {
                    code: true,
                    name: true,
                    description: true,
                  },
                },
              },
            },
          },
        }),
      ]);

      // Map tasks with master service line info from joined data
      const tasks = tasksRaw.map(task => ({
        id: task.id,
        TaskDesc: task.TaskDesc,
        TaskCode: task.TaskCode,
        Active: task.Active,
        ServLineCode: task.ServLineCode,
        ServLineDesc: task.ServLineDesc,
        SLGroup: task.SLGroup,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        Client: task.Client,
        masterServiceLine: task.ServiceLineExternal?.masterCode || null,
      }));

      // Get unique ServiceLineMaster data from the joined results
      const serviceLineMasterMap = new Map<string, { code: string; name: string; description: string | null }>();
      tasksRaw.forEach(task => {
        const master = task.ServiceLineExternal?.ServiceLineMaster;
        if (master && master.code) {
          serviceLineMasterMap.set(master.code, {
            code: master.code,
            name: master.name,
            description: master.description,
          });
        }
      });
      const serviceLineMasterData = Array.from(serviceLineMasterMap.values());

      const responseData = {
        groupCode: groupInfo.groupCode,
        groupDesc: groupInfo.groupDesc,
        tasks,
        serviceLineMaster: serviceLineMasterData,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };

      // Cache the response
      await setCachedList(cacheParams, responseData);

      return NextResponse.json(successResponse(responseData));
    }

    // Build where clause for clients with service line filtering
    interface WhereClause {
      groupCode: string;
      OR?: Array<Record<string, { contains: string }>>;
      Task?: {
        some: {
          ServLineCode: {
            in: string[];
          };
        };
      };
    }

    const where: WhereClause = {
      groupCode,
      // Only show clients that have tasks in accessible service lines
      Task: {
        some: {
          ServLineCode: { in: accessibleServLineCodes },
        },
      },
    };

    if (search) {
      where.OR = [
        { clientNameFull: { contains: search } },
        { clientCode: { contains: search } },
        { industry: { contains: search } },
        { sector: { contains: search } },
      ];
    }

    // Execute count and data queries in parallel for better performance
    const [total, clients] = await Promise.all([
      prisma.client.count({ where }),
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          clientNameFull: 'asc',
        },
        select: {
          id: true,
          ClientID: true,
          clientCode: true,
          clientNameFull: true,
          clientPartner: true,
          industry: true,
          active: true,
          _count: {
            select: {
              Task: {
                where: {
                  ServLineCode: { in: accessibleServLineCodes },
                },
              },
            },
          },
        },
      }),
    ]);

    const responseData = {
      groupCode: groupInfo.groupCode,
      groupDesc: groupInfo.groupDesc,
      clients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache the response
    await setCachedList(cacheParams, responseData);

    return NextResponse.json(successResponse(responseData));
  } catch (error) {
    return handleApiError(error, 'Get Group Details');
  }
}

