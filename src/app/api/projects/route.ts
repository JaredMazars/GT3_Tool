import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError, AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { CreateProjectSchema } from '@/lib/validation/schemas';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { getUserServiceLines } from '@/lib/services/service-lines/serviceLineService';
import { getProjectsWithCounts } from '@/lib/services/projects/projectService';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const serviceLine = searchParams.get('serviceLine');
    const internalOnly = searchParams.get('internalOnly') === 'true';
    const clientProjectsOnly = searchParams.get('clientProjectsOnly') === 'true';

    // Get user's accessible service lines
    const userServiceLines = await getUserServiceLines(user.id);
    const accessibleServiceLines = userServiceLines.map(sl => sl.serviceLine);

    // Get projects with counts in single optimized query
    const allProjects = await getProjectsWithCounts(user.id, undefined, includeArchived);

    // Filter by service line access
    let projects = allProjects.filter(p => 
      accessibleServiceLines.includes(p.serviceLine)
    );

    // Filter by specific service line if provided
    if (serviceLine) {
      projects = projects.filter(p => p.serviceLine === serviceLine);
    }

    // Filter for internal projects only (no client assigned)
    if (internalOnly) {
      projects = projects.filter(p => p.clientId === null);
    }

    // Filter for client projects only (has client assigned)
    if (clientProjectsOnly) {
      projects = projects.filter(p => p.clientId !== null);
    }

    // Transform _count to match expected format
    const projectsWithCounts = projects.map(project => ({
      ...project,
      _count: {
        mappings: project._count.MappedAccount,
        taxAdjustments: project._count.TaxAdjustment,
      },
    }));
    
    return NextResponse.json(successResponse(projectsWithCounts));
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
    
    // Validate request body
    const validatedData = CreateProjectSchema.parse(body);

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
      },
    });

    return NextResponse.json(successResponse(project), { status: 201 });
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
