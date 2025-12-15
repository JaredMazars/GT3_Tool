import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { handleApiError } from '@/lib/utils/errorHandler';

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users
 * Get all users with their task assignments
 * Admin only
 */
export async function GET(_request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin access and user management permission
    const { checkFeature } = await import('@/lib/permissions/checkFeature');
    const { Feature } = await import('@/lib/permissions/features');
    
    const canAccessAdmin = await checkFeature(currentUser.id, Feature.ACCESS_ADMIN);
    const canManageUsers = await checkFeature(currentUser.id, Feature.MANAGE_USERS);
    
    if (!canAccessAdmin || !canManageUsers) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get all users with their task assignments
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true, // System role (SYSTEM_ADMIN or USER)
        createdAt: true,
        updatedAt: true,
        TaskTeam: {
          select: {
            id: true,
            role: true,
            createdAt: true,
            Task: {
              select: {
                id: true,
                TaskDesc: true,
                TaskCode: true,
                ServLineDesc: true,
                Client: {
                  select: {
                    id: true,
                    GSClientID: true,
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
    // Import getUserServiceLines to get properly grouped service line data
    const { getUserServiceLines } = await import('@/lib/services/service-lines/serviceLineService');
    
    const usersWithMetrics = await Promise.all(users.map(async user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      tasks: user.TaskTeam.map(tt => ({
        id: tt.id,
        role: tt.role,
        task: {
          id: tt.Task.id,
          name: tt.Task.TaskDesc,
          taskCode: tt.Task.TaskCode,
          projectType: tt.Task.ServLineDesc,
          client: tt.Task.Client ? {
            id: tt.Task.Client.id,
            GSClientID: tt.Task.Client.GSClientID,
            clientCode: tt.Task.Client.clientCode,
            clientNameFull: tt.Task.Client.clientNameFull,
          } : null,
        },
      })),
      // Use getUserServiceLines to get properly grouped service line data
      // This matches the structure returned by the modal's fetchUserServiceLines
      serviceLines: await getUserServiceLines(user.id),
      taskCount: user.TaskTeam.length,
      lastActivity: user.Session[0]?.expires || user.updatedAt,
      roles: [...new Set(user.TaskTeam.map(tt => tt.role))],
    })));

    return NextResponse.json({
      success: true,
      data: usersWithMetrics,
    });
  } catch (error) {
    return handleApiError(error);
  }
}


