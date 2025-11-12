import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleApiError, AppError, ErrorCodes } from '@/lib/utils/errorHandler';
import { createProjectSchema } from '@/lib/utils/validation';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser, getUserProjects } from '@/lib/services/auth/auth';
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

    // Get projects user has access to
    const userProjects = await getUserProjects(user.id);

    // Filter by archived status if specified
    const projects = includeArchived
      ? userProjects
      : userProjects.filter(p => !p.archived);

    // Get counts for each project
    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        const counts = await prisma.project.findUnique({
          where: { id: project.id },
          include: {
            _count: {
              select: {
                MappedAccount: true,
                TaxAdjustment: true,
              },
            },
          },
        });
        
        return {
          ...project,
          _count: counts?._count || { mappings: 0, taxAdjustments: 0 },
        };
      })
    );
    
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
    
    console.log('[DEBUG] Creating project with user:', JSON.stringify(user));
    
    // Check if user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    console.log('[DEBUG] User found in database:', !!dbUser);
    
    if (!dbUser) {
      console.error('[ERROR] User not found in database. User ID from session:', user.id);
      return NextResponse.json({ 
        error: 'User not found in database. Please log out and log back in.' 
      }, { status: 400 });
    }
    
    const body = await request.json();
    
    // Validate request body
    const validatedData = createProjectSchema.parse(body);

    // Create project with user as admin
    const project = await prisma.project.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        projectType: validatedData.projectType || 'TAX_CALCULATION',
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
