import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isSystemAdmin } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';

/**
 * POST /api/admin/users/[userId]/projects
 * Add user to multiple projects
 * Admin only
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isSystemAdmin(currentUser.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await context.params;
    const body = await request.json();
    const { projectIds, role } = body;

    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json({ error: 'Project IDs array is required' }, { status: 400 });
    }

    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Add user to all specified projects
    const results = await Promise.allSettled(
      projectIds.map((projectId: number) =>
        prisma.projectUser.upsert({
          where: {
            projectId_userId: {
              projectId,
              userId: params.userId,
            },
          },
          update: {
            role,
          },
          create: {
            projectId,
            userId: params.userId,
            role,
          },
        })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      message: `Added user to ${successful} projects${failed > 0 ? `, ${failed} failed` : ''}`,
      stats: { successful, failed },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/admin/users/[userId]/projects
 * Update user role across multiple projects
 * Admin only
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isSystemAdmin(currentUser.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await context.params;
    const body = await request.json();
    const { projectIds, role } = body;

    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json({ error: 'Project IDs array is required' }, { status: 400 });
    }

    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }

    // Update role for specified projects
    await prisma.projectUser.updateMany({
      where: {
        userId: params.userId,
        projectId: { in: projectIds },
      },
      data: {
        role,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Updated role to ${role} for ${projectIds.length} projects`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/users/[userId]/projects
 * Remove user from multiple projects
 * Admin only
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isSystemAdmin(currentUser.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await context.params;
    const body = await request.json();
    const { projectIds } = body;

    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json({ error: 'Project IDs array is required' }, { status: 400 });
    }

    // Remove user from specified projects
    await prisma.projectUser.deleteMany({
      where: {
        userId: params.userId,
        projectId: { in: projectIds },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Removed user from ${projectIds.length} projects`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

