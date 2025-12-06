import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError, AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { UpdateClientSchema, ClientIDSchema } from '@/lib/validation/schemas';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { z } from 'zod';
import { getExternalServiceLinesByMaster } from '@/lib/utils/serviceLineExternal';
import { getTaskCountsByServiceLine, getTotalTaskCount } from '@/lib/services/tasks/taskAggregation';
import { getCachedClient, setCachedClient, invalidateClientCache } from '@/lib/services/clients/clientCache';

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
    
    const params = await context.params;
    const clientID = params.id;

    // Validate ClientID is a valid GUID
    const validationResult = ClientIDSchema.safeParse(clientID);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid client ID format. Expected GUID.' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Pagination params for tasks
    const taskPage = Number.parseInt(searchParams.get('taskPage') || '1');
    const taskLimit = Math.min(Number.parseInt(searchParams.get('taskLimit') || '20'), 50);
    const serviceLine = searchParams.get('serviceLine') || undefined;
    const includeArchived = searchParams.get('includeArchived') === 'true';
    
    // Try to get cached client data
    const cached = await getCachedClient(clientID, serviceLine, includeArchived);
    if (cached) {
      return NextResponse.json(successResponse(cached));
    }
    
    const taskSkip = (taskPage - 1) * taskLimit;

    // Get ServLineCodes for the requested service line
    let servLineCodes: string[] | undefined;
    if (serviceLine) {
      const externalServiceLines = await getExternalServiceLinesByMaster(serviceLine);
      servLineCodes = externalServiceLines
        .map(sl => sl.ServLineCode)
        .filter((code): code is string => code !== null);
    }

    // Build task where clause
    interface TaskWhereClause {
      ClientCode: string;
      Active?: string;
      ServLineCode?: { in: string[] };
    }
    const taskWhere: TaskWhereClause = {
      ClientCode: '', // Will be set below after we get the client
    };
    
    if (!includeArchived) {
      taskWhere.Active = 'Yes';
    }
    if (servLineCodes && servLineCodes.length > 0) {
      taskWhere.ServLineCode = { in: servLineCodes };
    }

    // Get the client by ClientID
    const client = await prisma.client.findUnique({
      where: { ClientID: clientID },
      select: {
        id: true,
        ClientID: true,
        clientCode: true,
        clientNameFull: true,
        groupCode: true,
        groupDesc: true,
        clientPartner: true,
        clientManager: true,
        clientIncharge: true,
        active: true,
        clientDateOpen: true,
        clientDateTerminate: true,
        industry: true,
        sector: true,
        forvisMazarsIndustry: true,
        forvisMazarsSector: true,
        forvisMazarsSubsector: true,
        clientOCFlag: true,
        clientTaxFlag: true,
        clientSecFlag: true,
        creditor: true,
        rolePlayer: true,
        typeCode: true,
        typeDesc: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Set the ClientCode (now GUID) in the where clause
    taskWhere.ClientCode = client.ClientID;

    // Get tasks for this client and task counts in parallel
    const [tasks, totalTasks, taskCountsByServiceLine] = await Promise.all([
      prisma.task.findMany({
        where: taskWhere,
        orderBy: { updatedAt: 'desc' },
        skip: taskSkip,
        take: taskLimit,
        select: {
          id: true,
          TaskDesc: true,
          TaskCode: true,
          Active: true,
          createdAt: true,
          updatedAt: true,
          ServLineCode: true, // Include to derive serviceLine
          ExternalTaskID: true,
          TaskDateOpen: true,
          TaskDateTerminate: true,
          TaskPartner: true,
          TaskPartnerName: true,
          TaskManager: true,
          TaskManagerName: true,
          _count: {
            select: {
              MappedAccount: true,
              TaxAdjustment: true,
            },
          },
        },
      }),
      prisma.task.count({
        where: taskWhere,
      }),
      // OPTIMIZED: Single aggregated query instead of 9 separate counts
      getTaskCountsByServiceLine(client.ClientID, includeArchived),
    ]);

    // Calculate total across all service lines
    const totalAcrossAllServiceLines = Object.values(taskCountsByServiceLine).reduce((sum, count) => sum + count, 0);

    // Get mapping from ServLineCode to masterCode for deriving masterServiceLine
    const allServLineCodes = tasks.map(t => t.ServLineCode);
    const serviceLineMapping: Record<string, string> = {};
    if (allServLineCodes.length > 0) {
      const mappings = await prisma.serviceLineExternal.findMany({
        where: { ServLineCode: { in: allServLineCodes } },
        select: { ServLineCode: true, masterCode: true },
      });
      mappings.forEach(m => {
        if (m.ServLineCode && m.masterCode) {
          serviceLineMapping[m.ServLineCode] = m.masterCode;
        }
      });
    }

    // Add masterServiceLine to each task
    const tasksWithMasterServiceLine = tasks.map(task => ({
      ...task,
      masterServiceLine: serviceLineMapping[task.ServLineCode] || null,
    }));

    const responseData = {
      ...client,
      tasks: tasksWithMasterServiceLine,
      _count: {
        Task: totalAcrossAllServiceLines, // Total across all service lines (not filtered by active tab)
      },
      taskPagination: {
        page: taskPage,
        limit: taskLimit,
        total: totalTasks, // Filtered count for pagination
        totalPages: Math.ceil(totalTasks / taskLimit),
      },
      taskCountsByServiceLine,
    };

    // Cache the response
    await setCachedClient(clientID, responseData, serviceLine, includeArchived);

    return NextResponse.json(successResponse(responseData));
  } catch (error) {
    return handleApiError(error, 'Get Client');
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
    
    const params = await context.params;
    const clientID = params.id;

    // Validate ClientID is a valid GUID
    const validationResult = ClientIDSchema.safeParse(clientID);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid client ID format. Expected GUID.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validatedData = UpdateClientSchema.parse(body);

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { ClientID: clientID },
    });

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Check for duplicate client code if provided and different from current
    if (validatedData.clientCode && validatedData.clientCode !== existingClient.clientCode) {
      const duplicateClient = await prisma.client.findUnique({
        where: { clientCode: validatedData.clientCode },
      });

      if (duplicateClient) {
        return handleApiError(
          new AppError(400, `Client code '${validatedData.clientCode}' is already in use`, ErrorCodes.VALIDATION_ERROR),
          'Update Client'
        );
      }
    }

    // Update client
    const client = await prisma.client.update({
      where: { ClientID: clientID },
      data: validatedData,
    });

    // Invalidate cache after update
    await invalidateClientCache(clientID);

    return NextResponse.json(successResponse(client));
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return handleApiError(
        new AppError(400, message, ErrorCodes.VALIDATION_ERROR),
        'Update Client'
      );
    }
    
    // Handle Prisma unique constraint violations
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      const meta = 'meta' in error && error.meta && typeof error.meta === 'object' ? error.meta : null;
      const target = meta && 'target' in meta ? meta.target : null;
      if (target && Array.isArray(target) && target.includes('clientCode')) {
        return handleApiError(
          new AppError(400, 'Client code is already in use', ErrorCodes.VALIDATION_ERROR),
          'Update Client'
        );
      }
    }
    
    return handleApiError(error, 'Update Client');
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
    
    const params = await context.params;
    const clientID = params.id;

    // Validate ClientID is a valid GUID
    const validationResult = ClientIDSchema.safeParse(clientID);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid client ID format. Expected GUID.' },
        { status: 400 }
      );
    }

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { ClientID: clientID },
      include: {
        _count: {
          select: {
            Task: true,
          },
        },
      },
    });

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Check if client has tasks
    if (existingClient._count.Task > 0) {
      return NextResponse.json(
        { error: 'Cannot delete client with existing tasks. Please reassign or delete tasks first.' },
        { status: 400 }
      );
    }

    // Delete client
    await prisma.client.delete({
      where: { ClientID: clientID },
    });

    // Invalidate cache after delete
    await invalidateClientCache(clientID);

    return NextResponse.json(
      successResponse({ message: 'Client deleted successfully' })
    );
  } catch (error) {
    return handleApiError(error, 'Delete Client');
  }
}

