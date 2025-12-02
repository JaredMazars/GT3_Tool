import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { handleApiError } from '@/lib/utils/errorHandler';

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error, 'GET /api/auth/session');
  }
}

















