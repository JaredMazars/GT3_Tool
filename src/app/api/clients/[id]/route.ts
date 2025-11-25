import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError, AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { UpdateClientSchema } from '@/lib/validation/schemas';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { z } from 'zod';

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
    const clientId = parseInt(params.id);

    if (isNaN(clientId)) {
      return NextResponse.json(
        { error: 'Invalid client ID' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Pagination params for projects
    const projectPage = parseInt(searchParams.get('projectPage') || '1');
    const projectLimit = Math.min(parseInt(searchParams.get('projectLimit') || '20'), 50);
    const serviceLine = searchParams.get('serviceLine') || undefined;
    const includeArchived = searchParams.get('includeArchived') === 'true';
    
    const projectSkip = (projectPage - 1) * projectLimit;

    // Build project where clause
    interface ProjectWhereClause {
      archived?: boolean;
      serviceLine?: string;
    }
    const projectWhere: ProjectWhereClause = {};
    if (!includeArchived) {
      projectWhere.archived = false;
    }
    if (serviceLine) {
      projectWhere.serviceLine = serviceLine;
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        Project: {
          where: projectWhere,
          orderBy: { updatedAt: 'desc' },
          skip: projectSkip,
          take: projectLimit,
          select: {
            id: true,
            name: true,
            description: true,
            projectType: true,
            serviceLine: true,
            taxYear: true,
            status: true,
            archived: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                MappedAccount: true,
                TaxAdjustment: true,
              },
            },
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Get total project count with filters
    const totalProjects = await prisma.project.count({
      where: {
        clientId,
        ...projectWhere,
      },
    });

    // Get project counts per service line for tab display (all 9 service lines)
    const projectCountsByServiceLine = await Promise.all([
      prisma.project.count({ where: { clientId, archived: !includeArchived ? false : undefined, serviceLine: 'TAX' } }),
      prisma.project.count({ where: { clientId, archived: !includeArchived ? false : undefined, serviceLine: 'AUDIT' } }),
      prisma.project.count({ where: { clientId, archived: !includeArchived ? false : undefined, serviceLine: 'ACCOUNTING' } }),
      prisma.project.count({ where: { clientId, archived: !includeArchived ? false : undefined, serviceLine: 'ADVISORY' } }),
      prisma.project.count({ where: { clientId, archived: !includeArchived ? false : undefined, serviceLine: 'QRM' } }),
      prisma.project.count({ where: { clientId, archived: !includeArchived ? false : undefined, serviceLine: 'BUSINESS_DEV' } }),
      prisma.project.count({ where: { clientId, archived: !includeArchived ? false : undefined, serviceLine: 'IT' } }),
      prisma.project.count({ where: { clientId, archived: !includeArchived ? false : undefined, serviceLine: 'FINANCE' } }),
      prisma.project.count({ where: { clientId, archived: !includeArchived ? false : undefined, serviceLine: 'HR' } }),
    ]);

    // Calculate total across all service lines
    const totalAcrossAllServiceLines = projectCountsByServiceLine.reduce((sum, count) => sum + count, 0);

    // Transform Project to projects for frontend compatibility
    const { Project, ...clientWithoutProject } = client;
    const responseData = {
      ...clientWithoutProject,
      projects: Project.map(project => ({
        ...project,
        _count: {
          mappings: project._count.MappedAccount,
          taxAdjustments: project._count.TaxAdjustment,
        },
      })),
      _count: {
        Project: totalAcrossAllServiceLines, // Total across all service lines (not filtered by active tab)
      },
      projectPagination: {
        page: projectPage,
        limit: projectLimit,
        total: totalProjects, // Filtered count for pagination
        totalPages: Math.ceil(totalProjects / projectLimit),
      },
      projectCountsByServiceLine: {
        TAX: projectCountsByServiceLine[0],
        AUDIT: projectCountsByServiceLine[1],
        ACCOUNTING: projectCountsByServiceLine[2],
        ADVISORY: projectCountsByServiceLine[3],
        QRM: projectCountsByServiceLine[4],
        BUSINESS_DEV: projectCountsByServiceLine[5],
        IT: projectCountsByServiceLine[6],
        FINANCE: projectCountsByServiceLine[7],
        HR: projectCountsByServiceLine[8],
      },
    };

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
    const clientId = parseInt(params.id);

    if (isNaN(clientId)) {
      return NextResponse.json(
        { error: 'Invalid client ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validatedData = UpdateClientSchema.parse(body);

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id: clientId },
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
      where: { id: clientId },
      data: validatedData,
    });

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
    const clientId = parseInt(params.id);

    if (isNaN(clientId)) {
      return NextResponse.json(
        { error: 'Invalid client ID' },
        { status: 400 }
      );
    }

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        _count: {
          select: {
            Project: true,
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

    // Check if client has projects
    if (existingClient._count.Project > 0) {
      return NextResponse.json(
        { error: 'Cannot delete client with existing projects. Please reassign or delete projects first.' },
        { status: 400 }
      );
    }

    // Delete client
    await prisma.client.delete({
      where: { id: clientId },
    });

    return NextResponse.json(
      successResponse({ message: 'Client deleted successfully' })
    );
  } catch (error) {
    return handleApiError(error, 'Delete Client');
  }
}

