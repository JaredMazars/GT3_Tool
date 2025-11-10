import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/errorHandler';
import { successResponse } from '@/lib/apiUtils';
import { getCurrentUser } from '@/lib/auth';
import { searchADUsers, listADUsers } from '@/lib/graphClient';

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

    // Validate limit
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    let users;
    
    // If query is provided, search; otherwise list users
    if (query.trim()) {
      users = await searchADUsers(query.trim(), limit);
    } else {
      users = await listADUsers(limit);
    }

    // Transform to simpler format
    const formattedUsers = users.map(u => ({
      id: u.id,
      email: u.mail || u.userPrincipalName,
      displayName: u.displayName,
      jobTitle: u.jobTitle,
      department: u.department,
    }));

    return NextResponse.json(successResponse(formattedUsers));
  } catch (error) {
    return handleApiError(error, 'Search AD Users');
  }
}


