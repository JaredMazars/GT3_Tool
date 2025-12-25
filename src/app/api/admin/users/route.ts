import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { secureRoute, Feature } from '@/lib/api/secureRoute';
import { getUserServiceLines } from '@/lib/services/service-lines/serviceLineService';

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users
 * Get all users with their task assignments
 * Admin only - requires ACCESS_ADMIN and MANAGE_USERS features
 */
export const GET = secureRoute.query({
  feature: Feature.MANAGE_USERS,
  handler: async (_request, { user }) => {
    // Get all users with their task assignments
    const users = await prisma.user.findMany({
      take: 500,
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
          take: 50, // Limit tasks per user
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
      orderBy: [
        { name: 'asc' },
        { id: 'asc' },
      ],
    });

    // Transform data to include useful metrics
    const usersWithMetrics = await Promise.all(users.map(async dbUser => ({
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
      tasks: dbUser.TaskTeam.map(tt => ({
        id: tt.id,
        role: tt.role,
        task: {
          id: tt.Task.id,
          name: tt.Task.TaskDesc,
          taskCode: tt.Task.TaskCode,
          serviceLine: tt.Task.ServLineDesc,
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
      serviceLines: await getUserServiceLines(dbUser.id),
      taskCount: dbUser.TaskTeam.length,
      lastActivity: dbUser.Session[0]?.expires || dbUser.updatedAt,
      roles: [...new Set(dbUser.TaskTeam.map(tt => tt.role))],
    })));

    return NextResponse.json({
      success: true,
      data: usersWithMetrics,
    });
  },
});
