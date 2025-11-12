import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isSystemAdmin } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';

/**
 * GET /api/admin/users/[userId]
 * Get detailed user information
 * Admin only
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
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

    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      include: {
        ProjectUser: {
          include: {
            Project: {
              include: {
                Client: true,
              },
            },
          },
        },
        Session: {
          orderBy: {
            expires: 'desc',
          },
          take: 5,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/users/[userId]
 * Remove user from all projects
 * Admin only
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
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

    // Remove user from all projects
    await prisma.projectUser.deleteMany({
      where: { userId: params.userId },
    });

    return NextResponse.json({
      success: true,
      message: 'User removed from all projects',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

