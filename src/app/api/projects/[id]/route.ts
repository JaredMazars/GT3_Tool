import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { parseProjectId, successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';
import { getCurrentUser, checkProjectAccess } from '@/lib/services/auth/auth';
import { Prisma } from '@prisma/client';
import { sanitizeText } from '@/lib/utils/sanitization';

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
    
    // Handle "new" route - this is not a valid project ID
    if (params?.id === 'new') {
      return NextResponse.json(
        { error: 'Invalid route - use POST /api/projects to create a new project' },
        { status: 404 }
      );
    }
    
    const projectId = parseProjectId(params?.id);

    // Check project access (any role can view)
    const hasAccess = await checkProjectAccess(user.id, projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if team members should be included
    const { searchParams } = new URL(request.url);
    const includeTeam = searchParams.get('includeTeam') === 'true';

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        description: true,
        projectType: true,
        serviceLine: true,
        taxYear: true,
        taxPeriodStart: true,
        taxPeriodEnd: true,
        assessmentYear: true,
        submissionDeadline: true,
        clientId: true,
        Client: {
          select: {
            id: true,
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
        status: true,
        archived: true,
        // Client Acceptance and Engagement Letter Workflow fields
        acceptanceApproved: true,
        acceptanceApprovedBy: true,
        acceptanceApprovedAt: true,
        engagementLetterGenerated: true,
        engagementLetterContent: true,
        engagementLetterTemplateId: true,
        engagementLetterGeneratedBy: true,
        engagementLetterGeneratedAt: true,
        engagementLetterUploaded: true,
        engagementLetterPath: true,
        engagementLetterUploadedBy: true,
        engagementLetterUploadedAt: true,
        _count: {
          select: {
            MappedAccount: true,
            TaxAdjustment: true,
          },
        },
        // Only include team members if requested
        ...(includeTeam && {
          ProjectUser: {
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

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

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

    return NextResponse.json(successResponse(transformedProject));
  } catch (error) {
    return handleApiError(error, 'Get Project');
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
        { error: 'Invalid route - use POST /api/projects to create a new project' },
        { status: 404 }
      );
    }
    
    const projectId = parseProjectId(params?.id);

    // Check project access (requires EDITOR role or higher)
    const hasAccess = await checkProjectAccess(user.id, projectId, 'EDITOR');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Build update data object
    const updateData: Prisma.ProjectUpdateInput = {};
    
    if (body.name !== undefined) {
      const sanitizedName = sanitizeText(body.name, { maxLength: 200 });
      if (!sanitizedName) {
        return NextResponse.json(
          { error: 'Project name is required' },
          { status: 400 }
        );
      }
      updateData.name = sanitizedName;
    }
    
    if (body.description !== undefined) {
      updateData.description = sanitizeText(body.description, { 
        maxLength: 1000,
        allowHTML: false,
        allowNewlines: true 
      });
    }
    
    if (body.projectType !== undefined) {
      updateData.projectType = body.projectType;
    }
    
    if (body.taxYear !== undefined) {
      updateData.taxYear = body.taxYear;
    }
    
    if (body.taxPeriodStart !== undefined) {
      updateData.taxPeriodStart = body.taxPeriodStart ? new Date(body.taxPeriodStart) : null;
    }
    
    if (body.taxPeriodEnd !== undefined) {
      updateData.taxPeriodEnd = body.taxPeriodEnd ? new Date(body.taxPeriodEnd) : null;
    }
    
    if (body.assessmentYear !== undefined) {
      updateData.assessmentYear = body.assessmentYear;
    }
    
    if (body.submissionDeadline !== undefined) {
      updateData.submissionDeadline = body.submissionDeadline ? new Date(body.submissionDeadline) : null;
    }
    
    if (body.clientId !== undefined) {
      if (body.clientId === null) {
        updateData.Client = { disconnect: true };
      } else {
        updateData.Client = { connect: { id: body.clientId } };
      }
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        Client: true,
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
      _count: project._count ? {
        mappings: project._count.MappedAccount,
        taxAdjustments: project._count.TaxAdjustment,
      } : undefined,
    };

    return NextResponse.json(successResponse(transformedProject));
  } catch (error) {
    return handleApiError(error, 'Update Project');
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
        { error: 'Invalid route - use POST /api/projects to create a new project' },
        { status: 404 }
      );
    }
    
    const projectId = parseProjectId(params?.id);

    // Check project access (requires ADMIN role)
    const hasAccess = await checkProjectAccess(user.id, projectId, 'ADMIN');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'restore') {
      // Restore archived project to active status
      const project = await prisma.project.update({
        where: { id: projectId },
        data: { archived: false },
      });

      return NextResponse.json(successResponse({ 
        message: 'Project restored successfully',
        project 
      }));
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    return handleApiError(error, 'Process Project Action');
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
        { error: 'Invalid route - use POST /api/projects to create a new project' },
        { status: 404 }
      );
    }
    
    const projectId = parseProjectId(params?.id);

    // Check project access (requires ADMIN role)
    const hasAccess = await checkProjectAccess(user.id, projectId, 'ADMIN');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Archive the project instead of deleting
    const project = await prisma.project.update({
      where: { id: projectId },
      data: { archived: true },
    });

    return NextResponse.json(successResponse({ 
      message: 'Project archived successfully',
      project 
    }));
  } catch (error) {
    return handleApiError(error, 'Archive Project');
  }
} 