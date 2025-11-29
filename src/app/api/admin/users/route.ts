import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isSystemAdmin } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

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

    // Check permission
    const { checkUserPermission } = await import('@/lib/services/permissions/permissionService');
    const hasPermission = await checkUserPermission(currentUser.id, 'admin.users', 'READ');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }

    // Get all users with their project assignments
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true, // System role (SYSTEM_ADMIN or USER)
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
                    clientCode: true,
                    clientNameFull: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        ServiceLineUser: {
          select: {
            id: true,
            serviceLine: true,
            role: true,
          },
          orderBy: {
            serviceLine: 'asc',
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
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      projects: user.ProjectUser.map(pu => ({
        ...pu,
        project: {
          id: pu.Project.id,
          name: pu.Project.name,
          projectType: pu.Project.projectType,
          client: pu.Project.Client ? {
            id: pu.Project.Client.id,
            clientCode: pu.Project.Client.clientCode,
            clientNameFull: pu.Project.Client.clientNameFull,
          } : null,
        },
      })),
      serviceLines: user.ServiceLineUser,
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

