import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError, AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { CreateProjectSchema } from '@/lib/validation/schemas';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { getUserServiceLines } from '@/lib/services/service-lines/serviceLineService';
import { getProjectsWithCounts } from '@/lib/services/projects/projectService';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { sanitizeObject } from '@/lib/utils/sanitization';

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const search = searchParams.get('search') || '';
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const serviceLine = searchParams.get('serviceLine');
    const internalOnly = searchParams.get('internalOnly') === 'true';
    const clientProjectsOnly = searchParams.get('clientProjectsOnly') === 'true';
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    const skip = (page - 1) * limit;

    // Get user's accessible service lines
    const userServiceLines = await getUserServiceLines(user.id);
    const accessibleServiceLines = userServiceLines.map(sl => sl.serviceLine);

    // Build where clause for database-level filtering
    const where: Prisma.ProjectWhereInput = {
      ProjectUser: {
        some: {
          userId: user.id,
        },
      },
      serviceLine: {
        in: accessibleServiceLines,
      },
    };

    // Filter by archived status
    if (!includeArchived) {
      where.archived = false;
    }

    // Filter by specific service line
    if (serviceLine) {
      where.serviceLine = serviceLine;
    }

    // Filter for internal projects only (no client assigned)
    if (internalOnly) {
      where.clientId = null;
    }

    // Filter for client projects only (has client assigned)
    if (clientProjectsOnly) {
      where.clientId = { not: null };
    }

    // Add search filter
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { Client: { clientNameFull: { contains: search } } },
        { Client: { clientCode: { contains: search } } },
      ];
    }

    // Build orderBy
    const orderBy: Prisma.ProjectOrderByWithRelationInput = {};
    const validSortFields = ['name', 'updatedAt', 'createdAt', 'taxYear'] as const;
    type ValidSortField = typeof validSortFields[number];
    if (validSortFields.includes(sortBy as ValidSortField)) {
      orderBy[sortBy as ValidSortField] = sortOrder;
    } else {
      orderBy.updatedAt = 'desc';
    }

    // Get total count
    const total = await prisma.project.count({ where });

    // Get projects with optimized query
    const projects = await prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        name: true,
        description: true,
        projectType: true,
        serviceLine: true,
        status: true,
        archived: true,
        clientId: true,
        taxYear: true,
        createdAt: true,
        updatedAt: true,
        Client: {
          select: {
            id: true,
            clientNameFull: true,
            clientCode: true,
          },
        },
        _count: {
          select: {
            MappedAccount: true,
            TaxAdjustment: true,
          },
        },
      },
    });

    // Transform _count and Client to match expected format
    const projectsWithCounts = projects.map(project => ({
      ...project,
      client: project.Client, // Transform Client → client for consistency
      Client: undefined, // Remove original Client field
      _count: {
        mappings: project._count.MappedAccount,
        taxAdjustments: project._count.TaxAdjustment,
      },
    }));
    
    return NextResponse.json(
      successResponse({
        projects: projectsWithCounts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    );
  } catch (error) {
    return handleApiError(error, 'Get Projects');
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    
    const body = await request.json();
    
    // Sanitize input before validation
    const sanitizedBody = sanitizeObject(body, { maxLength: 1000 });
    
    // Validate request body
    const validatedData = CreateProjectSchema.parse(sanitizedBody);

    // Check if user has access to the service line
    const userServiceLines = await getUserServiceLines(user.id);
    const hasAccess = userServiceLines.some(
      sl => sl.serviceLine === validatedData.serviceLine
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this service line' },
        { status: 403 }
      );
    }

    // Create project with user as admin
    const project = await prisma.project.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        projectType: validatedData.projectType || 'TAX_CALCULATION',
        serviceLine: validatedData.serviceLine || 'TAX',
        taxYear: validatedData.taxYear,
        taxPeriodStart: validatedData.taxPeriodStart,
        taxPeriodEnd: validatedData.taxPeriodEnd,
        assessmentYear: validatedData.assessmentYear,
        submissionDeadline: validatedData.submissionDeadline,
        clientId: validatedData.clientId,
        status: 'ACTIVE',
        ProjectUser: {
          create: {
            userId: user.id,
            role: 'ADMIN',
          },
        },
      },
      include: {
        Client: true,
        ProjectUser: {
          include: {
            User: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            MappedAccount: true,
            TaxAdjustment: true,
          },
        },
      },
    });

    // Transform data to match expected format
    const transformedProject = {
      ...project,
      client: project.Client, // Transform Client → client for consistency
      Client: undefined, // Remove original Client field
      _count: {
        mappings: project._count.MappedAccount,
        taxAdjustments: project._count.TaxAdjustment,
      },
    };

    return NextResponse.json(successResponse(transformedProject), { status: 201 });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return handleApiError(
        new AppError(400, message, ErrorCodes.VALIDATION_ERROR),
        'Create Project'
      );
    }
    
    return handleApiError(error, 'Create Project');
  }
}
