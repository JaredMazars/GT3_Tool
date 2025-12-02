import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth/auth';
import { getUserServiceLines } from '@/lib/services/service-lines/serviceLineService';
import { successResponse } from '@/lib/utils/apiUtils';
import { handleApiError } from '@/lib/utils/errorHandler';

// Mark as dynamic since we use cookies for authentication
export const dynamic = 'force-dynamic';

/**
 * GET /api/service-lines
 * Get all service lines accessible to the current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceLines = await getUserServiceLines(user.id);

    return NextResponse.json(successResponse(serviceLines));
  } catch (error) {
    return handleApiError(error, 'GET /api/service-lines');
  }
}

