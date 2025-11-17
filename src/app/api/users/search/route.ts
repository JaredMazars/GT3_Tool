import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/utils/errorHandler';
import { successResponse } from '@/lib/utils/apiUtils';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { prisma } from '@/lib/db/prisma';

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    const projectId = searchParams.get('projectId');

    // Validate limit
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Build where clause for search
    const whereClause: any = {};
    
    if (query.trim()) {
      // Search by name or email (case-insensitive)
      whereClause.OR = [
        { name: { contains: query.trim(), mode: 'insensitive' } },
        { email: { contains: query.trim(), mode: 'insensitive' } },
      ];
    }

    // Get users from database
    let users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
      },
      take: limit,
      orderBy: {
        name: 'asc',
      },
    });

    // If projectId is provided, filter out users already in the project
    if (projectId) {
      const projectUsers = await prisma.projectUser.findMany({
        where: { projectId: parseInt(projectId) },
        select: { userId: true },
      });
      
      const projectUserIds = new Set(projectUsers.map(pu => pu.userId));
      users = users.filter(u => !projectUserIds.has(u.id));
    }

    // Transform to expected format
    const formattedUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      displayName: u.name || u.email,
      jobTitle: null,
      department: null,
    }));

    return NextResponse.json(successResponse(formattedUsers));
  } catch (error) {
    return handleApiError(error, 'Search Users');
  }
}


