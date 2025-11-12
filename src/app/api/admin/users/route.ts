import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isSystemAdmin } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';

/**
 * GET /api/admin/users
 * Get all users with their project assignments
 * Admin only
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is system admin
    const isAdmin = await isSystemAdmin(currentUser.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get all users with their project assignments
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        ProjectUser: {
          select: {
            id: true,
            role: true,
            createdAt: true,
            Project: {
              select: {
                id: true,
                name: true,
                projectType: true,
                Client: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        Session: {
          select: {
            expires: true,
          },
          orderBy: {
            expires: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Transform data to include useful metrics
    const usersWithMetrics = users.map(user => ({
      ...user,
      projects: user.ProjectUser.map(pu => ({
        ...pu,
        project: {
          ...pu.Project,
          client: pu.Project.Client,
        },
      })),
      projectCount: user.ProjectUser.length,
      lastActivity: user.Session[0]?.expires || user.updatedAt,
      roles: [...new Set(user.ProjectUser.map(p => p.role))],
    }));

    return NextResponse.json({
      success: true,
      data: usersWithMetrics,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

