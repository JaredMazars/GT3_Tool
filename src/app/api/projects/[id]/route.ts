import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseProjectId, successResponse } from '@/lib/apiUtils';
import { handleApiError } from '@/lib/errorHandler';
import { getCurrentUser, checkProjectAccess } from '@/lib/auth';

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
    const projectId = parseProjectId(params?.id);

    // Check project access (any role can view)
    await checkProjectAccess(user.id, projectId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        archived: true,
        _count: {
          select: {
            mappings: true,
            taxAdjustments: true,
          },
        },
        users: {
          select: {
            id: true,
            role: true,
            user: {
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

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(successResponse(project));
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
    const projectId = parseProjectId(params?.id);

    // Check project access (requires EDITOR role or higher)
    await checkProjectAccess(user.id, projectId, 'EDITOR');

    const body = await request.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    return NextResponse.json(successResponse(project));
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
    const projectId = parseProjectId(params?.id);

    // Check project access (requires OWNER role)
    await checkProjectAccess(user.id, projectId, 'OWNER');

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
    const projectId = parseProjectId(params?.id);

    // Check project access (requires OWNER role)
    await checkProjectAccess(user.id, projectId, 'OWNER');

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